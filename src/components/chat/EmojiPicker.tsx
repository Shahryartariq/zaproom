"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EMOJI_GROUPS, RECENT_KEY, insertAt, parseRecent, pushRecent, searchEmoji, type Emoji, type EmojiGroup } from "@/lib/emoji";
import { Icon } from "../Icon";

/**
 * Wires a textarea to the picker: inserts the emoji at the caret (replacing any
 * selection), then puts the caret straight after it.
 */
export function useEmojiInsert(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  text: string,
  setText: (text: string) => void,
  max: number,
) {
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (caret.current === null || !el) return;
    el.setSelectionRange(caret.current, caret.current);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    caret.current = null;
  }, [ref, text]);

  return useCallback(
    (emoji: string) => {
      const el = ref.current;
      const start = el?.selectionStart ?? text.length;
      const end = el?.selectionEnd ?? text.length;
      const next = insertAt(text, start, end, emoji, max);
      if (next.text === text) return;
      caret.current = next.caret;
      setText(next.text);
    },
    [ref, text, setText, max],
  );
}

type Props = {
  onPick: (emoji: string) => void;
  disabled?: boolean;
};

export function EmojiPicker({ onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div className="emoji-wrap" ref={wrap}>
      <button
        ref={toggle}
        type="button"
        className={open ? "btn ghost emoji-toggle on" : "btn ghost emoji-toggle"}
        aria-label={open ? "Close emoji" : "Add emoji"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        // Keep the caret in the message box when opening with a mouse or finger.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="smile" />
      </button>
      {open ? (
        <EmojiPanel
          id={panelId}
          onPick={onPick}
          onClose={() => {
            setOpen(false);
            toggle.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

function readRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

function EmojiPanel({ id, onPick, onClose }: { id: string; onPick: (emoji: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  // What's shown stays put while the panel is open; picks still update storage.
  const [shownRecent] = useState(readRecent);
  const [active, setActive] = useState(shownRecent.length ? "Recent" : (EMOJI_GROUPS[0]?.name ?? ""));
  const scroller = useRef<HTMLDivElement>(null);

  const groups: EmojiGroup[] = useMemo(() => {
    if (query.trim()) return [{ name: "Results", icon: "", items: searchEmoji(query) }];
    if (!shownRecent.length) return EMOJI_GROUPS;
    const byChar = new Map(EMOJI_GROUPS.flatMap((g) => g.items).map((e) => [e.char, e]));
    const recent = shownRecent.map((c) => byChar.get(c)).filter((e): e is Emoji => !!e);
    return [{ name: "Recent", icon: "🕘", items: recent }, ...EMOJI_GROUPS];
  }, [query, shownRecent]);

  function pick(emoji: string) {
    onPick(emoji);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(pushRecent(readRecent(), emoji)));
    } catch {
      // Private mode or full storage: recents just aren't kept.
    }
  }

  function jump(name: string) {
    setActive(name);
    const target = scroller.current?.querySelector<HTMLElement>(`[data-group="${name}"]`);
    if (target && scroller.current) scroller.current.scrollTop = target.offsetTop - scroller.current.offsetTop;
  }

  function onScroll() {
    const el = scroller.current;
    if (!el || query) return;
    let current = groups[0]?.name;
    for (const section of el.querySelectorAll<HTMLElement>("[data-group]")) {
      if (section.offsetTop - el.offsetTop <= el.scrollTop + 8) current = section.dataset.group;
    }
    if (current && current !== active) setActive(current);
  }

  /** Arrow keys move between emoji; Up and Down go to the nearest one in the next row. */
  function onGridKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(scroller.current?.querySelectorAll<HTMLButtonElement>("button[data-emoji]") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const current = buttons[index];
    if (!current) return;
    let next = index;
    if (e.key === "ArrowRight") next = Math.min(index + 1, buttons.length - 1);
    else if (e.key === "ArrowLeft") next = Math.max(index - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const from = current.getBoundingClientRect();
      const down = e.key === "ArrowDown";
      let best = -1;
      let bestScore = Infinity;
      buttons.forEach((b, i) => {
        const r = b.getBoundingClientRect();
        const dy = down ? r.top - from.top : from.top - r.top;
        if (dy < 4) return;
        const score = dy * 1000 + Math.abs(r.left - from.left);
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      });
      if (best >= 0) next = best;
    } else return;
    const target = buttons[next];
    if (!target) return;
    e.preventDefault();
    current.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
    target.scrollIntoView({ block: "nearest" });
  }

  return (
    <div
      className="emoji-panel"
      id={id}
      role="dialog"
      aria-label="Emoji"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <label className="sr-only" htmlFor={`${id}-search`}>
        Search emoji
      </label>
      <input
        id={`${id}-search`}
        className="input emoji-search"
        type="search"
        placeholder="Search emoji"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query ? null : (
        <nav className="emoji-tabs" aria-label="Emoji groups">
          {groups.map((g) => (
            <button
              key={g.name}
              type="button"
              className={g.name === active ? "on" : undefined}
              aria-label={g.name}
              aria-current={g.name === active ? "true" : undefined}
              title={g.name}
              onClick={() => jump(g.name)}
            >
              {g.icon}
            </button>
          ))}
        </nav>
      )}
      <div className="emoji-scroll" ref={scroller} onScroll={onScroll} onKeyDown={onGridKey}>
        {groups.map((g, gi) => (
          <section key={g.name} data-group={g.name} aria-label={g.name}>
            <h3>{g.name}</h3>
            {g.items.length ? (
              <div className="emoji-grid">
                {g.items.map((e, i) => {
                  const tab = gi === 0 && i === 0 ? 0 : -1;
                  return (
                    <button
                      key={`${g.name}-${e.char}`}
                      type="button"
                      data-emoji={e.char}
                      tabIndex={tab}
                      aria-label={e.name}
                      title={e.name}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => pick(e.char)}
                    >
                      {e.char}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="emoji-none">No emoji match “{query.trim()}”.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

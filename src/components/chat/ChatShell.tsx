"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { MAX_TEXT } from "@/lib/chat/protocol";
import { GROUP, dmKey, dmList, isDm, peerOf, type ChatMessage, type Conversation, type Person } from "@/lib/chat/state";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { useSettings } from "../settings/useSettings";
import type { ChatEngine } from "./useChatEngine";

type Props = {
  chat: ChatEngine;
  groupName: string;
  groupHint: string;
  /** Extra buttons for the conversation header (Leave, for text rooms). */
  headerExtra?: React.ReactNode;
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFmt.format(d);
}

function preview(c: Conversation | undefined): string {
  const last = c?.messages.at(-1);
  if (!last) return "";
  return `${last.mine ? "You: " : ""}${last.text}`.replace(/\s+/g, " ");
}

export function ChatShell({ chat, groupName, groupHint, headerExtra }: Props) {
  const id = useId();
  const { state, online, onlineIds, open } = chat;
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  // On phones the list and the conversation take turns filling the screen.
  const [showList, setShowList] = useState(true);
  const connection = useConnectionState();

  const dms = dmList(state);
  const group = state.convos[GROUP];
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  const dmPeers = new Set(dms.map((c) => peerOf(c.key)));

  function choose(key: string) {
    open(key);
    setShowList(false);
  }

  return (
    <div className={showList ? "chat-app list-open" : "chat-app convo-open"}>
      <aside className="chat-side" aria-label="Conversations">
        <div className="chat-side-head">
          <label className="sr-only" htmlFor={`${id}-search`}>
            Search people and chats
          </label>
          <input
            id={`${id}-search`}
            className="input search"
            type="search"
            placeholder="Search people and chats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <nav className="chat-lists" aria-label="Chats">
          <ul className="convo-list">
            {match(groupName) ? (
              <ConvoItem
                active={state.active === GROUP}
                onClick={() => choose(GROUP)}
                avatar={
                  <span className="group-avatar" aria-hidden="true">
                    <Icon name="people" />
                  </span>
                }
                title={groupName}
                subtitle={chat.typingNames(GROUP)[0] ? `${chat.typingNames(GROUP)[0]} is typing…` : preview(group) || groupHint}
                typing={chat.typingNames(GROUP).length > 0}
                time={group?.lastAt}
                unread={group?.unread ?? 0}
              />
            ) : null}
          </ul>

          {dms.length > 0 ? (
            <>
              <h2 className="list-title">Direct messages</h2>
              <ul className="convo-list">
                {dms
                  .filter((c) => match(c.peer?.name ?? ""))
                  .map((c) => {
                    const peer = c.peer;
                    const typing = chat.typingNames(c.key).length > 0;
                    return (
                      <ConvoItem
                        key={c.key}
                        active={state.active === c.key}
                        onClick={() => choose(c.key)}
                        avatar={<PersonAvatar person={peer} online={onlineIds.has(peerOf(c.key))} />}
                        title={peer?.name ?? "Someone"}
                        subtitle={typing ? "typing…" : preview(c)}
                        typing={typing}
                        time={c.lastAt}
                        unread={c.unread}
                      />
                    );
                  })}
              </ul>
            </>
          ) : null}

          <h2 className="list-title">
            Online now <span className="count-pill">{online.length}</span>
          </h2>
          {online.length === 0 ? (
            <p className="list-empty">Nobody else is here yet. Share the link and say hi when they arrive.</p>
          ) : (
            <ul className="people-list">
              {online
                .filter((p) => match(p.name))
                .map((p) => (
                  <li key={p.identity}>
                    <button
                      className="person-btn"
                      onClick={() => choose(dmKey(p.identity))}
                      aria-label={`Message ${p.name}`}
                    >
                      <PersonAvatar person={p} online />
                      <span className="person-name">{p.name}</span>
                      {dmPeers.has(p.identity) ? null : <span className="hint">Say hi</span>}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </nav>
        {connection !== ConnectionState.Connected ? (
          <p className="conn-banner" role="status">
            {connection === ConnectionState.Reconnecting ? "Reconnecting…" : "Connecting…"}
          </p>
        ) : null}
      </aside>

      <Conversation
        chat={chat}
        groupName={groupName}
        groupHint={groupHint}
        onBack={() => setShowList(true)}
        headerExtra={headerExtra}
      />
    </div>
  );
}

function PersonAvatar({ person, online }: { person?: Person; online: boolean }) {
  return (
    <span className="avatar-wrap">
      <Avatar name={person?.name ?? "?"} color={person?.color} size="s" />
      {online ? <span className="online-dot" aria-hidden="true" /> : null}
    </span>
  );
}

function ConvoItem(props: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  title: string;
  subtitle: string;
  typing: boolean;
  time?: number;
  unread: number;
}) {
  return (
    <li>
      <button
        className={props.active ? "convo-item active" : "convo-item"}
        onClick={props.onClick}
        aria-current={props.active ? "true" : undefined}
      >
        {props.avatar}
        <span className="convo-text">
          <span className="convo-top">
            <strong>{props.title}</strong>
            {props.time ? <time>{timeFmt.format(props.time)}</time> : null}
          </span>
          <span className="convo-bottom">
            <span className={props.typing ? "convo-sub typing" : "convo-sub"}>{props.subtitle}</span>
            {props.unread ? (
              <span className="unread" aria-label={`${props.unread} unread`}>
                {props.unread > 99 ? "99+" : props.unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function Conversation({
  chat,
  groupName,
  groupHint,
  onBack,
  headerExtra,
}: {
  chat: ChatEngine;
  groupName: string;
  groupHint: string;
  onBack: () => void;
  headerExtra?: React.ReactNode;
}) {
  const { state, online, onlineIds, send, sendTyping, error, setError } = chat;
  const [settings] = useSettings();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const key = state.active;
  const convo = state.convos[key];
  const messages = useMemo(() => convo?.messages ?? [], [convo]);
  const dm = isDm(key);
  const peer = dm ? (online.find((p) => p.identity === peerOf(key)) ?? convo?.peer) : undefined;
  const peerOnline = dm && onlineIds.has(peerOf(key));
  const typing = chat.typingNames(key);

  // Stay at the bottom as messages arrive, unless the person scrolled up to read.
  const stick = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, key, typing.length]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    stick.current = true;
  }, [key]);

  async function submit() {
    const ok = await send(text);
    if (ok) {
      setText("");
      stick.current = true;
    }
  }

  const status = dm
    ? typing.length
      ? "typing…"
      : peerOnline
        ? "online"
        : "offline"
    : typing.length
      ? `${typing.slice(0, 2).join(", ")} ${typing.length > 1 ? "are" : "is"} typing…`
      : `${online.length + 1} online`;

  return (
    <section className="chat-main" aria-label={dm ? `Chat with ${peer?.name ?? "someone"}` : groupName}>
      <header className="chat-head">
        <button className="btn ghost back" onClick={onBack} aria-label="Back to chats">
          <Icon name="back" />
        </button>
        {dm ? (
          <PersonAvatar person={peer} online={Boolean(peerOnline)} />
        ) : (
          <span className="group-avatar" aria-hidden="true">
            <Icon name="people" />
          </span>
        )}
        <div className="chat-title">
          <h1>{dm ? (peer?.name ?? "Someone") : groupName}</h1>
          <p className={typing.length ? "typing" : undefined} aria-live="polite">
            {status}
          </p>
        </div>
        <span className="spacer" />
        {headerExtra}
      </header>

      <ol
        className="chat-messages"
        data-dm={dm || undefined}
        ref={listRef}
        aria-label="Messages"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.length === 0 ? (
          <li className="chat-empty-state">
            {dm ? (
              <>
                <strong>Say hi to {peer?.name ?? "them"}</strong>
                <span>Only the two of you see these messages. They&apos;re kept on your devices, never on a server.</span>
              </>
            ) : (
              <>
                <strong>{groupHint}</strong>
                <span>Everyone here sees these messages. Messages sent before you arrived aren&apos;t shown.</span>
              </>
            )}
          </li>
        ) : (
          messages.map((m, i) => <Bubble key={`${m.from}-${m.id}`} m={m} prev={messages[i - 1]} dm={dm} />)
        )}
        {typing.length ? (
          <li className="typing-row" aria-hidden="true">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
          </li>
        ) : null}
      </ol>

      {dm && !peerOnline ? (
        <p className="chat-note" role="status">
          {peer?.name ?? "They"} went offline. You can read your chat, but new messages can&apos;t be delivered until they&apos;re back.
        </p>
      ) : null}
      {error ? (
        <p className="form-error chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="sr-only" htmlFor="chat-text">
          Message
        </label>
        <textarea
          id="chat-text"
          ref={inputRef}
          className="input"
          rows={1}
          value={text}
          maxLength={MAX_TEXT}
          disabled={dm && !peerOnline}
          placeholder={dm ? `Message ${peer?.name ?? ""}` : `Message ${groupName}`}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
            if (e.target.value) sendTyping();
            // Grow with the text, up to the CSS max height.
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            const sendNow = settings.enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
            if (sendNow) {
              e.preventDefault();
              void submit();
              e.currentTarget.style.height = "auto";
            }
          }}
        />
        <button className="btn primary send" type="submit" disabled={!text.trim() || (dm && !peerOnline)} aria-label="Send message">
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}

function Bubble({ m, prev, dm }: { m: ChatMessage; prev?: ChatMessage; dm: boolean }) {
  const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
  const grouped = !newDay && prev && !prev.system && prev.from === m.from && m.at - prev.at < 120_000;
  return (
    <>
      {newDay ? (
        <li className="day-divider">
          <span>{dayLabel(m.at)}</span>
        </li>
      ) : null}
      {m.system ? (
        <li className="system-line">{m.text}</li>
      ) : (
        <li className={["bubble-row", m.mine ? "mine" : "theirs", grouped ? "grouped" : ""].join(" ").trim()}>
          {!m.mine && !dm && !grouped ? <Avatar name={m.name} color={m.color} size="xs" /> : null}
          <div className="bubble">
            {!m.mine && !dm && !grouped ? <span className={`bubble-name c-${m.color}`}>{m.name}</span> : null}
            <p>{m.text}</p>
            <span className="bubble-meta">
              <time dateTime={new Date(m.at).toISOString()}>{timeFmt.format(m.at)}</time>
              {m.mine && dm ? (
                <span className={m.seen ? "ticks seen" : "ticks"} role="img" aria-label={m.seen ? "Seen" : "Sent"}>
                  {m.seen ? "✓✓" : "✓"}
                </span>
              ) : null}
            </span>
          </div>
        </li>
      )}
    </>
  );
}

"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SOUNDS, type SoundId } from "@/lib/settings";
import { playSound } from "@/lib/sounds";
import { Icon } from "../Icon";
import { ProfileFields } from "../ProfileFields";
import { ThemeSwitch } from "../ThemeSwitch";
import { useProfileDraft } from "../useProfileDraft";
import { useSettings } from "./useSettings";

const permissionStore = {
  subscribe(cb: () => void) {
    window.addEventListener("focus", cb);
    return () => window.removeEventListener("focus", cb);
  },
  get: (): NotificationPermission | "unsupported" =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
};

export function SettingsButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Settings" title="Settings">
        <Icon name="settings" />
      </button>
      <dialog
        ref={ref}
        className="sheet settings"
        aria-labelledby="settings-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clicking the dimmed backdrop closes the dialog.
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open ? <SettingsBody onClose={() => setOpen(false)} /> : null}
      </dialog>
    </>
  );
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [s, update] = useSettings();
  const permission = useSyncExternalStore(permissionStore.subscribe, permissionStore.get, () => "default" as const);
  const draft = useProfileDraft();
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function toggleDesktop(on: boolean) {
    if (!on) return update({ desktop: false });
    if (typeof Notification === "undefined") return;
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    update({ desktop: result === "granted" });
  }

  function pick(sound: SoundId) {
    update({ sound });
    playSound(sound, s.volume);
  }

  return (
    <div className="settings-body">
      <header className="settings-head">
        <h2 id="settings-title">Settings</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close settings">
          <Icon name="close" />
        </button>
      </header>

      <section aria-labelledby={`${id}-notif`}>
        <h3 id={`${id}-notif`}>Notifications</h3>
        <fieldset className="choice-group">
          <legend>Message sound</legend>
          <div className="sound-grid">
            {SOUNDS.map((sound) => (
              <span key={sound.id} className="sound-choice">
                <input
                  type="radio"
                  id={`${id}-${sound.id}`}
                  name={`${id}-sound`}
                  value={sound.id}
                  checked={s.sound === sound.id}
                  onChange={() => pick(sound.id)}
                />
                <label htmlFor={`${id}-${sound.id}`}>
                  <Icon name={sound.id === "none" ? "bellOff" : "bell"} />
                  {sound.label}
                </label>
              </span>
            ))}
          </div>
          <p className="hint">Picking a sound plays it so you can hear it.</p>
        </fieldset>

        <label className="field" htmlFor={`${id}-vol`}>
          <span>
            Volume <output htmlFor={`${id}-vol`}>{Math.round(s.volume * 100)}%</output>
          </span>
          <span className="range-row">
            <input
              id={`${id}-vol`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(s.volume * 100)}
              onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
              onPointerUp={() => playSound(s.sound, s.volume)}
              onKeyUp={() => playSound(s.sound, s.volume)}
            />
            <button type="button" className="btn ghost small" onClick={() => playSound(s.sound, s.volume)} disabled={s.sound === "none"}>
              Test
            </button>
          </span>
        </label>

        <div className="toggles">
          <Toggle label="Global chat and text rooms" checked={s.ringGroup} onChange={(v) => update({ ringGroup: v })} />
          <Toggle label="Private messages" checked={s.ringDirect} onChange={(v) => update({ ringDirect: v })} />
          <Toggle label="Chat during calls" checked={s.ringCalls} onChange={(v) => update({ ringCalls: v })} />
          <Toggle
            label="Pop-up notifications when Zaproom is in the background"
            checked={s.desktop && permission === "granted"}
            disabled={permission === "unsupported" || permission === "denied"}
            onChange={(v) => void toggleDesktop(v)}
          />
        </div>
        {permission === "denied" ? (
          <p className="hint">Notifications are blocked for this site. Allow them in your browser&apos;s site settings.</p>
        ) : permission === "unsupported" ? (
          <p className="hint">This browser can&apos;t show pop-up notifications.</p>
        ) : null}
        <p className="hint">Sounds only play for conversations you aren&apos;t looking at.</p>
      </section>

      <section aria-labelledby={`${id}-chat`}>
        <h3 id={`${id}-chat`}>Chat</h3>
        <div className="toggles">
          <Toggle
            label="Press Enter to send (Shift+Enter for a new line)"
            checked={s.enterToSend}
            onChange={(v) => update({ enterToSend: v })}
          />
        </div>
        <div className="actions start">
          <button
            type="button"
            className="btn small"
            onClick={() => {
              try {
                for (const key of Object.keys(localStorage)) if (key.startsWith("zaproom:chat:")) localStorage.removeItem(key);
              } catch {
                // Nothing stored.
              }
              setCleared(true);
            }}
          >
            Delete saved chats on this device
          </button>
          {cleared ? (
            <span className="hint" role="status">
              Deleted. Open chats keep their messages until you reload.
            </span>
          ) : null}
        </div>
      </section>

      <section aria-labelledby={`${id}-look`}>
        <h3 id={`${id}-look`}>Appearance</h3>
        <ThemeSwitch />
      </section>

      <section aria-labelledby={`${id}-you`}>
        <h3 id={`${id}-you`}>Profile</h3>
        <form
          className="settings-profile"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.commit()) setSaved(true);
          }}
          noValidate
        >
          <ProfileFields
            name={draft.name}
            color={draft.color}
            onName={(v) => {
              draft.setName(v);
              setSaved(false);
            }}
            onColor={(c) => {
              draft.setColor(c);
              setSaved(false);
            }}
            error={draft.error}
          />
          <div className="actions start">
            <button className="btn small" type="submit">
              Save name
            </button>
            {saved ? (
              <span className="hint" role="status">
                Saved. Used the next time you join a room or chat.
              </span>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="toggle">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

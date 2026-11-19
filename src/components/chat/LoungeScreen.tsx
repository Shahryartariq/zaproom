"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { ProfileFields } from "../ProfileFields";
import { useProfile } from "../ProfileProvider";
import type { Connection } from "../room/types";
import { useProfileDraft } from "../useProfileDraft";
import { ChatApp, preloadLive } from "../live";

const DEVICE = "zaproom:device";
const STORAGE = "zaproom:chat:lounge";

/** A random key that identifies this browser to Zaproom's server, created once. */
function deviceKey(): string {
  try {
    const saved = localStorage.getItem(DEVICE);
    if (saved && /^[A-Za-z0-9_-]{32,64}$/.test(saved)) return saved;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    localStorage.setItem(DEVICE, key);
    return key;
  } catch {
    // Private mode: a new identity each visit.
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
}

type Phase =
  | { step: "gate"; note?: string }
  | { step: "joining" }
  | { step: "chat"; conn: Connection; attempt: number }
  | { step: "elsewhere" };

export function LoungeScreen() {
  const draft = useProfileDraft();
  const { profile, ready } = useProfile();
  const [phase, setPhase] = useState<Phase>({ step: "gate" });
  const attempt = useRef(0);
  const auto = useRef(false);

  const join = useCallback(
    async (p: { name: string; color: string }) => {
      // Joining by hand also counts as the one automatic join for this visit: saving a
      // first-time name would otherwise trigger the returning-visitor auto-join too.
      auto.current = true;
      setPhase({ step: "joining" });
      try {
        const res = await fetch("/api/chat/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...p, device: deviceKey() }),
        });
        const data = (await res.json()) as Partial<Connection> & { error?: string };
        if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Couldn't open the chat.");
        attempt.current += 1;
        setPhase({ step: "chat", conn: { token: data.token, url: data.url }, attempt: attempt.current });
      } catch (err) {
        setPhase({ step: "gate", note: err instanceof Error ? err.message : "Couldn't open the chat." });
      }
    },
    [],
  );

  // People who already picked a name go straight in.
  useEffect(() => {
    if (!ready || auto.current || !profile) return;
    auto.current = true;
    const timer = setTimeout(() => void join(profile), 0);
    return () => clearTimeout(timer);
  }, [ready, profile, join]);

  if (phase.step === "chat") {
    const current = phase.attempt;
    return (
      <ChatApp
        key={current}
        conn={phase.conn}
        groupName="Global chat"
        groupHint="Say hello to everyone online"
        storageKey={STORAGE}
        announceJoins={false}
        onDisconnected={(reason) => {
          if (attempt.current !== current) return;
          if (reason === "elsewhere") setPhase({ step: "elsewhere" });
          else setPhase({ step: "gate", note: "You were disconnected. Join again to keep chatting." });
        }}
      />
    );
  }

  if (phase.step === "elsewhere") {
    return (
      <div className="state-screen">
        <div>
          <h1>Chat is open in another tab</h1>
          <p>Zaproom chat works in one tab at a time, so your messages always reach the right place.</p>
          <button className="btn primary" onClick={() => profile && void join(profile)}>
            Use it here
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="strangers">
      <h1>Chat</h1>
      <p className="lead">
        A global group for everyone online, plus private one-to-one chats. Tap anyone in the online list to message them.
      </p>
      <ul className="rules">
        <li>Global messages are seen by everyone here and aren&apos;t stored anywhere.</li>
        <li>Private chats go only to the other person and are kept on your device so you can pick them up later.</li>
        <li>Choose your notification sound in Settings.</li>
      </ul>
      <form
        className="panel start-form"
        onFocus={preloadLive}
        onPointerEnter={preloadLive}
        onSubmit={(e) => {
          e.preventDefault();
          const p = draft.commit();
          if (p) void join(p);
        }}
        noValidate
      >
        <ProfileFields name={draft.name} color={draft.color} onName={draft.setName} onColor={draft.setColor} error={draft.error} />
        {phase.step === "gate" && phase.note ? (
          <p className="form-error" role="alert">
            {phase.note}
          </p>
        ) : null}
        <button className="btn primary big" type="submit" disabled={phase.step === "joining"}>
          <Icon name="chat" />
          {phase.step === "joining" ? "Opening chat…" : "Open chat"}
        </button>
      </form>
      <p className="hint">
        Want to talk instead? <Link href="/">Start or join a room</Link>.
      </p>
    </div>
  );
}

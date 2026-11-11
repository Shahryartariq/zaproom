"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LobbySnapshot } from "@/lib/rooms";
import { Icon } from "../Icon";
import { LiveRooms } from "./LiveRooms";
import { StartRoomForm } from "./StartRoomForm";

const POLL_MS = 5000;

export function Lobby() {
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/rooms", { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as LobbySnapshot;
          if (!stop) {
            setSnapshot(data);
            setFailed(false);
          }
        } catch {
          if (!stop) setFailed(true);
        }
      }
      if (!stop) timer = setTimeout(load, POLL_MS);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void load();
      }
    };
    void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const configured = snapshot?.configured ?? true;

  return (
    <>
      <div className="pulse-line" aria-live="polite">
        {snapshot && configured ? (
          <>
            <span>
              <span className="dot" aria-hidden="true" />
              <strong>{snapshot.online}</strong> {snapshot.online === 1 ? "person" : "people"} in rooms now
            </span>
            <span>
              <span className="dot chat" aria-hidden="true" />
              <strong>{snapshot.chatting}</strong> in the global chat
            </span>
            <span>
              <span className="dot live" aria-hidden="true" />
              <strong>{snapshot.waiting}</strong> waiting to meet someone
            </span>
          </>
        ) : null}
      </div>

      {!configured ? (
        <p className="notice" role="status">
          Calls are switched off on this copy of Zaproom. Add <code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code> and{" "}
          <code>LIVEKIT_API_SECRET</code> to turn them on.
        </p>
      ) : null}

      <div className="lobby-grid">
        <div className="side">
          <StartRoomForm disabled={!configured} />
          <section className="panel chat-card" aria-labelledby="chat-title">
            <h2 id="chat-title">Global chat</h2>
            <p>
              Text with everyone online, or tap a name to message them privately. Like a group chat, minus the sign-up.
            </p>
            <Link className="btn" href="/chat">
              <Icon name="chat" />
              Open chat
            </Link>
          </section>
          <section className="panel stranger-card" aria-labelledby="stranger-title">
            <h2 id="stranger-title">Meet someone new</h2>
            <p>Get matched with a random person for a one-to-one chat. Camera starts off, and you can skip any time.</p>
            <Link className="btn" href="/strangers">
              <Icon name="shuffle" />
              Meet a stranger
            </Link>
          </section>
        </div>
        <LiveRooms snapshot={snapshot} failed={failed} />
      </div>
    </>
  );
}

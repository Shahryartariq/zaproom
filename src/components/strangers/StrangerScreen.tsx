"use client";

import { Room } from "livekit-client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { ProfileFields } from "../ProfileFields";
import { Call } from "../room/Call";
import type { Connection, RoomInfo } from "../room/types";
import { useProfileDraft } from "../useProfileDraft";

type Phase =
  | { step: "intro"; note?: string }
  | { step: "searching"; note?: string }
  | { step: "call"; key: number; info: RoomInfo; conn: Connection }
  | { step: "over"; title: string; body: string };

const POLL_MS = 1500;
const NO_SHOW_MS = 20_000;

export function StrangerScreen() {
  const draft = useProfileDraft();
  const [phase, setPhase] = useState<Phase>({ step: "intro" });
  const callKey = useRef(0);
  const queue = useRef<{ room: Room; stop: () => void } | null>(null);

  const leaveQueue = useCallback(() => {
    queue.current?.stop();
    queue.current = null;
  }, []);

  useEffect(() => leaveQueue, [leaveQueue]);

  const search = useCallback(
    async (note?: string) => {
      const profile = draft.commit();
      if (!profile) return setPhase({ step: "intro" });
      leaveQueue();
      setPhase({ step: "searching", note });

      try {
        const res = await fetch("/api/strangers/queue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(profile),
        });
        const data = (await res.json()) as Partial<Connection> & { ticket?: string; error?: string };
        if (!res.ok || !data.token || !data.url || !data.ticket) throw new Error(data.error ?? "Couldn't join the line.");

        // Being connected to the hidden queue room is what keeps your place in line.
        const room = new Room();
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        queue.current = {
          room,
          stop: () => {
            stopped = true;
            clearTimeout(timer);
            void room.disconnect();
          },
        };
        await room.connect(data.url, data.token, { autoSubscribe: false });

        const ticket = data.ticket;
        const poll = async () => {
          if (stopped) return;
          try {
            const r = await fetch("/api/strangers/match", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ticket }),
            });
            const m = (await r.json()) as { status?: string; roomId?: string; token?: string; url?: string; error?: string };
            if (stopped) return;
            if (r.status === 401 || r.status === 503) {
              leaveQueue();
              setPhase({ step: "intro", note: m.error ?? "Your place in line expired. Start again." });
              return;
            }
            if (m.status === "matched" && m.roomId && m.token && m.url) {
              leaveQueue();
              callKey.current += 1;
              setPhase({
                step: "call",
                key: callKey.current,
                conn: { token: m.token, url: m.url },
                info: { id: m.roomId, title: "A stranger", topic: "", kind: "video", visibility: "stranger", count: 0 },
              });
              return;
            }
          } catch {
            // A dropped request: keep your place and ask again.
          }
          timer = setTimeout(() => void poll(), POLL_MS);
        };
        void poll();
      } catch (err) {
        leaveQueue();
        setPhase({ step: "intro", note: err instanceof Error ? err.message : "Couldn't join the line." });
      }
    },
    [draft, leaveQueue],
  );

  const cancel = () => {
    leaveQueue();
    setPhase({ step: "intro" });
  };

  if (phase.step === "call") {
    const key = phase.key;
    const current = () => callKey.current === key;
    return (
      <Call
        key={key}
        info={phase.info}
        conn={phase.conn}
        media={{ audio: true, video: false }}
        noShowMs={NO_SHOW_MS}
        onAlone={(why) => {
          if (!current()) return;
          callKey.current += 1;
          if (why === "no-show") void search("Your match didn't connect. Finding someone else…");
          else setPhase({ step: "over", title: "They left the chat", body: "Find someone new, or head back to the rooms." });
        }}
        onLeave={(reason) => {
          if (!current()) return;
          callKey.current += 1;
          setPhase({ step: "over", title: "Chat ended", body: reason });
        }}
        topExtra={
          <button
            className="btn primary"
            onClick={() => {
              callKey.current += 1;
              void search();
            }}
          >
            <Icon name="next" />
            Next
          </button>
        }
      />
    );
  }

  return (
    <div className="strangers">
      {phase.step === "searching" ? (
        <div className="searching" role="status" aria-live="polite">
          <div className="orbit">
            <Avatar name={draft.name || "?"} color={draft.color} size="l" />
          </div>
          <h1>Looking for someone…</h1>
          <p className="lead">{phase.note ?? "You'll be connected as soon as another person is free. Keep this tab open."}</p>
          <button className="btn" onClick={cancel}>
            Stop looking
          </button>
        </div>
      ) : phase.step === "over" ? (
        <div className="searching">
          <h1>{phase.title}</h1>
          <p className="lead">{phase.body}</p>
          <div className="actions">
            <button className="btn primary big" onClick={() => void search()}>
              <Icon name="shuffle" />
              Find someone new
            </button>
            <Link className="btn big" href="/">
              Back to rooms
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1>Meet a stranger</h1>
          <p className="lead">
            Get matched with a random person for a one-to-one chat. Talk, type, or turn on your camera when you&apos;re
            ready.
          </p>
          <ul className="rules">
            <li>Your camera starts off. Your mic starts on, and you can mute it.</li>
            <li>Press Next to skip to someone else, or End to stop.</li>
            <li>Nothing is recorded or stored. Be kind, and leave if anyone makes you uncomfortable.</li>
            <li>Only for people aged 18 and over.</li>
          </ul>
          <form
            className="panel start-form"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
            noValidate
          >
            <ProfileFields
              name={draft.name}
              color={draft.color}
              onName={draft.setName}
              onColor={draft.setColor}
              error={draft.error}
            />
            {phase.note ? (
              <p className="form-error" role="alert">
                {phase.note}
              </p>
            ) : null}
            <button className="btn primary big" type="submit">
              <Icon name="shuffle" />
              Start matching
            </button>
          </form>
        </>
      )}
    </div>
  );
}

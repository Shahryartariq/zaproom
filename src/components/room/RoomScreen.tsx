"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Call, ChatApp, LeaveButton } from "../live";
import { CopyInvite } from "./CopyInvite";
import { PreJoin } from "./PreJoin";
import { TextJoin } from "./TextJoin";
import type { Connection, MediaChoices, RoomInfo } from "./types";

type State =
  | { step: "loading" }
  | { step: "missing"; message: string }
  | { step: "prejoin"; info: RoomInfo }
  | { step: "call"; info: RoomInfo; conn: Connection; media: MediaChoices }
  | { step: "left"; info: RoomInfo; reason: string };

export function RoomScreen({ id }: { id: string }) {
  const [state, setState] = useState<State>({ step: "loading" });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as RoomInfo & { error?: string };
        if (cancelled) return;
        if (!res.ok) setState({ step: "missing", message: data.error ?? "This room isn't available." });
        else setState({ step: "prejoin", info: data });
      })
      .catch(() => {
        if (!cancelled) setState({ step: "missing", message: "Couldn't reach Zaproom. Check your connection and try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  useEffect(() => {
    document.title = state.step === "call" || state.step === "prejoin" ? `${state.info.title} | Zaproom` : "Join a room | Zaproom";
  }, [state]);

  if (state.step === "loading") {
    return (
      <div className="state-screen" aria-busy="true">
        <p>Opening the room…</p>
      </div>
    );
  }

  if (state.step === "missing") {
    return (
      <div className="state-screen">
        <div>
          <h1>Room not available</h1>
          <p>{state.message}</p>
          <p>Rooms close a few minutes after the last person leaves.</p>
          <Link className="btn primary" href="/">
            Go to the lobby
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === "left") {
    return (
      <div className="state-screen">
        <div>
          <h1>You left {state.info.title}</h1>
          <p>{state.reason}</p>
          <div className="actions">
            <button
              className="btn primary"
              onClick={() => {
                setState({ step: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Rejoin
            </button>
            <Link className="btn" href="/">
              Back to the lobby
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === "prejoin" && state.info.kind === "text") {
    const info = state.info;
    return <TextJoin info={info} onJoin={(conn) => setState({ step: "call", info, conn, media: { audio: false, video: false } })} />;
  }

  if (state.step === "prejoin") {
    return (
      <PreJoin
        info={state.info}
        onJoin={(conn, media) => setState({ step: "call", info: state.info, conn, media })}
      />
    );
  }

  if (state.info.kind === "text") {
    const info = state.info;
    return (
      <ChatApp
        conn={state.conn}
        groupName={info.title}
        groupHint={info.topic || "Start the conversation"}
        announceJoins
        onDisconnected={(reason) =>
          setState({
            step: "left",
            info,
            reason:
              reason === "left"
                ? "You can rejoin while the room is open."
                : reason === "closed"
                  ? "The room closed."
                  : "The connection dropped. Check your internet and rejoin.",
          })
        }
        headerExtra={
          <>
            <CopyInvite roomId={info.id} />
            <LeaveButton />
          </>
        }
      />
    );
  }

  return (
    <Call
      info={state.info}
      conn={state.conn}
      media={state.media}
      onLeave={(reason) => setState({ step: "left", info: state.info, reason })}
    />
  );
}

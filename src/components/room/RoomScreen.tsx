"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Call, ChatApp, LeaveButton } from "../live";
import { CONNECT_FAILED, OFFLINE, failure, readJson } from "@/lib/fetch-json";
import { CopyInvite } from "./CopyInvite";
import { PreJoin } from "./PreJoin";
import { TextJoin } from "./TextJoin";
import type { Connection, MediaChoices, RoomInfo } from "./types";

const noop = () => () => {};

/** Just created this room: the lobby sends you here with ?new=1. */
function useJustCreated(): boolean {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(location.search).get("new") === "1",
    () => false,
  );
}

/** Drops ?new=1 once you're in, so a reload or a shared address doesn't say "just created". */
function forgetJustCreated() {
  const url = new URL(location.href);
  if (!url.searchParams.has("new")) return;
  url.searchParams.delete("new");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function CreatedNotice({ id }: { id: string }) {
  return (
    <div className="notice created" role="status">
      <p>
        <strong>Your room is ready.</strong> Send the link to the people you want here, then join.
      </p>
      <CopyInvite roomId={id} />
    </div>
  );
}

type State =
  | { step: "loading" }
  | { step: "missing"; message: string; retry: boolean }
  | { step: "prejoin"; info: RoomInfo }
  | { step: "call"; info: RoomInfo; conn: Connection; media: MediaChoices }
  | { step: "left"; info: RoomInfo; reason: string };

export function RoomScreen({ id }: { id: string }) {
  const [state, setState] = useState<State>({ step: "loading" });

  const [attempt, setAttempt] = useState(0);
  const created = useJustCreated();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await readJson<RoomInfo>(res);
        if (cancelled) return;
        if (res.ok && data.id && data.title && data.kind) setState({ step: "prejoin", info: data as RoomInfo });
        // Only a 404 means the room is gone; anything else is worth another try.
        else if (res.status === 404) setState({ step: "missing", message: failure(res, data, "This room isn't available."), retry: false });
        else setState({ step: "missing", message: failure(res, data, "Couldn't open the room."), retry: true });
      })
      .catch(() => {
        if (!cancelled) setState({ step: "missing", message: OFFLINE, retry: true });
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
          <h1>{state.retry ? "Couldn't open the room" : "Room not available"}</h1>
          <p>{state.message}</p>
          {state.retry ? null : <p>Rooms close a few minutes after the last person leaves.</p>}
          <div className="actions">
            {state.retry ? (
              <button
                className="btn primary"
                onClick={() => {
                  setState({ step: "loading" });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
            ) : null}
            <Link className={state.retry ? "btn" : "btn primary"} href="/">
              Go to the lobby
            </Link>
          </div>
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
    return (
      <>
        {created ? <CreatedNotice id={info.id} /> : null}
        <TextJoin
          info={info}
          onJoin={(conn) => {
            forgetJustCreated();
            setState({ step: "call", info, conn, media: { audio: false, video: false } });
          }}
        />
      </>
    );
  }

  if (state.step === "prejoin") {
    const info = state.info;
    return (
      <>
        {created ? <CreatedNotice id={info.id} /> : null}
        <PreJoin
          info={info}
          onJoin={(conn, media) => {
            forgetJustCreated();
            setState({ step: "call", info, conn, media });
          }}
        />
      </>
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
                  : reason === "removed"
                    ? "You were removed from the room."
                    : reason === "failed"
                      ? CONNECT_FAILED
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

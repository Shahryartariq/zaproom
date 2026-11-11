"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { ProfileFields } from "../ProfileFields";
import { useProfileDraft } from "../useProfileDraft";
import type { Connection, RoomInfo } from "./types";

/** Joining a text room: just a name, no camera or microphone. */
export function TextJoin({ info, onJoin }: { info: RoomInfo; onJoin: (conn: Connection) => void }) {
  const draft = useProfileDraft();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const profile = draft.commit();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId: info.id, ...profile }),
      });
      const data = (await res.json()) as Partial<Connection> & { error?: string };
      if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Couldn't join the room.");
      onJoin({ token: data.token, url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the room.");
      setBusy(false);
    }
  }

  const inside = info.count === 0 ? "Nobody's here yet" : `${info.count} ${info.count === 1 ? "person" : "people"} inside`;

  return (
    <form className="strangers" onSubmit={join} noValidate>
      <div className="room-facts">
        <span className="chip">
          <Icon name={info.visibility === "public" ? "globe" : "lock"} />
          {info.visibility === "public" ? "Listed in lobby" : "Link only"}
        </span>
        <span className="chip">
          <Icon name="chat" />
          Text room
        </span>
        <span className="chip">
          <Icon name="people" />
          {inside}
        </span>
      </div>
      <h1>{info.title}</h1>
      {info.topic ? <p className="lead">{info.topic}</p> : null}
      <div className="panel start-form">
        <ProfileFields
          name={draft.name}
          color={draft.color}
          onName={draft.setName}
          onColor={draft.setColor}
          error={draft.error}
          autoFocus={draft.ready && !draft.name}
        />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary big" type="submit" disabled={busy}>
          <Icon name="chat" />
          {busy ? "Joining…" : "Join chat"}
        </button>
      </div>
    </form>
  );
}

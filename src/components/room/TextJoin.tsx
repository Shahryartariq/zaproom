"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { preloadLive } from "../live";
import { ProfileFields } from "../ProfileFields";
import { useHydrated } from "../useHydrated";
import { useProfileDraft } from "../useProfileDraft";
import { postJson } from "@/lib/fetch-json";
import type { Connection, RoomInfo } from "./types";

/** Joining a text room: just a name, no camera or microphone. */
export function TextJoin({ info, onJoin }: { info: RoomInfo; onJoin: (conn: Connection) => void }) {
  const draft = useProfileDraft();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const profile = draft.commit();
    if (!profile) return;
    setBusy(true);
    setError(null);
    const result = await postJson<Connection>("/api/token", { roomId: info.id, ...profile }, "Couldn't join the room.");
    if (result.ok && result.data.token && result.data.url) return onJoin({ token: result.data.token, url: result.data.url });
    setError(result.ok ? "Couldn't join the room." : result.error);
    setBusy(false);
  }

  const inside = info.count === 0 ? "Nobody's here yet" : `${info.count} ${info.count === 1 ? "person" : "people"} inside`;

  return (
    <form className="strangers" onSubmit={join} onFocus={preloadLive} onPointerEnter={preloadLive} noValidate>
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
        <button className="btn primary big" type="submit" disabled={busy || !hydrated}>
          <Icon name="chat" />
          {busy ? "Joining…" : "Join chat"}
        </button>
      </div>
    </form>
  );
}

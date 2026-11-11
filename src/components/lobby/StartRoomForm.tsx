"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createRoomSchema } from "@/lib/profile";
import { Icon } from "../Icon";
import { ProfileFields } from "../ProfileFields";
import { useProfileDraft } from "../useProfileDraft";

export function StartRoomForm({ disabled }: { disabled: boolean }) {
  const id = useId();
  const router = useRouter();
  const draft = useProfileDraft();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [kind, setKind] = useState<"video" | "voice" | "text">("video");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.commit()) return;
    const parsed = createRoomSchema.safeParse({ title, topic, visibility, kind });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the room details.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Couldn't create the room.");
      router.push(`/r/${data.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the room.");
      setBusy(false);
    }
  }

  return (
    <form className="panel start-form" onSubmit={onSubmit} aria-labelledby={`${id}-title`} noValidate>
      <h2 id={`${id}-title`}>Start a room</h2>
      <ProfileFields
        name={draft.name}
        color={draft.color}
        onName={draft.setName}
        onColor={draft.setColor}
        error={draft.error}
      />
      <label className="field" htmlFor={`${id}-room`}>
        <span>Room name</span>
        <input
          id={`${id}-room`}
          className="input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          maxLength={40}
          placeholder="Friday standup, Next.js help, Late-night lofi"
          required
        />
      </label>
      <label className="field" htmlFor={`${id}-topic`}>
        <span>Topic (optional)</span>
        <input
          id={`${id}-topic`}
          className="input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={80}
          placeholder="What's it about?"
        />
      </label>
      <Segmented
        legend="Who can find it"
        name={`${id}-vis`}
        value={visibility}
        onChange={setVisibility}
        options={[
          { value: "public", label: "Listed in lobby", icon: "globe" },
          { value: "private", label: "Link only", icon: "lock" },
        ]}
      />
      <Segmented
        legend="Room type"
        name={`${id}-kind`}
        value={kind}
        onChange={setKind}
        options={[
          { value: "video", label: "Video", icon: "cam" },
          { value: "voice", label: "Voice", icon: "wave" },
          { value: "text", label: "Text", icon: "chat" },
        ]}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn primary big" type="submit" disabled={busy || disabled}>
        {busy ? "Starting…" : "Start room"}
      </button>
    </form>
  );
}

type Option<T extends string> = { value: T; label: string; icon: "globe" | "lock" | "cam" | "wave" | "chat" };

function Segmented<T extends string>(props: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}) {
  return (
    <fieldset className="choice-group">
      <legend>{props.legend}</legend>
      <div className="segmented">
        {props.options.map((o) => (
          <span key={o.value} className="seg">
            <input
              type="radio"
              id={`${props.name}-${o.value}`}
              name={props.name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            <label htmlFor={`${props.name}-${o.value}`}>
              <Icon name={o.icon} />
              {o.label}
            </label>
          </span>
        ))}
      </div>
    </fieldset>
  );
}

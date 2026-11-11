"use client";

import { useState } from "react";
import { profileSchema, type AvatarColorId, type Profile } from "@/lib/profile";
import { useProfile } from "./ProfileProvider";

/** Editable copy of the saved name and colour. `commit()` validates and saves it. */
export function useProfileDraft() {
  const { profile, ready, save, suggestedColor } = useProfile();
  const [name, setName] = useState("");
  const [color, setColor] = useState<AvatarColorId>("tangerine");
  const [error, setError] = useState<string | null>(null);
  // What the draft was last filled from, so later changes elsewhere (Settings) can flow
  // in without overwriting anything the person is typing here.
  const [loadedFrom, setLoadedFrom] = useState<{ name: string; color: AvatarColorId } | null>(null);
  const saved = ready ? { name: profile?.name ?? "", color: profile?.color ?? suggestedColor } : null;
  if (saved && (!loadedFrom || loadedFrom.name !== saved.name || loadedFrom.color !== saved.color)) {
    const untouched = !loadedFrom || (name === loadedFrom.name && color === loadedFrom.color);
    setLoadedFrom(saved);
    if (untouched) {
      setName(saved.name);
      setColor(saved.color);
    }
  }

  function commit(): Profile | null {
    const parsed = profileSchema.safeParse({ name, color });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your name.");
      return null;
    }
    setError(null);
    save(parsed.data);
    return parsed.data;
  }

  return {
    name,
    color,
    error,
    ready,
    setName: (v: string) => {
      setName(v);
      if (error) setError(null);
    },
    setColor,
    commit,
  };
}

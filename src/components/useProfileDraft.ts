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
  const [loaded, setLoaded] = useState(false);

  // Fill in the saved profile once storage is readable (adjusting state during render).
  if (ready && !loaded) {
    setLoaded(true);
    setName(profile?.name ?? "");
    setColor(profile?.color ?? suggestedColor);
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

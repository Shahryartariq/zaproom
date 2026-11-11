"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { AVATAR_COLORS, profileSchema, type Profile } from "@/lib/profile";

const KEY = "zaproom:profile";
const listeners = new Set<() => void>();

type Stored = { name: string; color: Profile["color"] };

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const p = profileSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

const noop = () => () => {};
let picked: Profile["color"] | null = null;
function pickColor(): Profile["color"] {
  picked ??= AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]?.id ?? "tangerine";
  return picked;
}

type Ctx = {
  /** Null until the person has chosen a name. */
  profile: Stored | null;
  /** A colour to suggest before they've picked one. */
  suggestedColor: Profile["color"];
  save: (p: Stored) => void;
  ready: boolean;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  // Server render and first client render agree on "no profile yet", then storage takes over.
  const raw = useSyncExternalStore(subscribe, read, () => "__server__");
  const ready = raw !== "__server__";
  const profile = useMemo(() => (ready ? parse(raw) : null), [raw, ready]);

  const save = useCallback((p: Stored) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Private mode: the name lasts for this page only.
    }
    listeners.forEach((l) => l());
  }, []);

  // A different starting colour per visit, picked once storage is readable (never during SSR).
  const suggestedColor = useSyncExternalStore(noop, pickColor, () => "tangerine" as const);

  const value = useMemo(() => ({ profile, save, ready, suggestedColor }), [profile, save, ready, suggestedColor]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

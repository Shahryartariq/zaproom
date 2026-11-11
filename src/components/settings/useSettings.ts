"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "@/lib/settings";

const KEY = "zaproom:settings";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Settings } | null = null;

function read(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Private mode: defaults for this page.
  }
  if (!cache || cache.raw !== raw) cache = { raw, value: parseSettings(raw) };
  return cache.value;
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

/** Settings outside React (event handlers in the chat engine). */
export function currentSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : read();
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...read(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      cache = { raw: JSON.stringify(next), value: next };
    }
    listeners.forEach((l) => l());
  }, []);
  return [settings, update];
}

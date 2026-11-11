"use client";

import { shouldRing } from "@/lib/settings";
import { playSound } from "@/lib/sounds";
import { currentSettings } from "./useSettings";

type Notice = {
  kind: "group" | "direct" | "call";
  /** True when the person is already looking at this conversation. */
  watching: boolean;
  title: string;
  body: string;
  /** Messages with the same tag replace each other instead of piling up. */
  tag: string;
};

/** Plays the chosen sound and, if allowed, shows a system notification. */
export function notify(n: Notice): void {
  const s = currentSettings();
  if (shouldRing(s, n.kind, n.watching)) playSound(s.sound, s.volume);
  if (
    s.desktop &&
    document.visibilityState === "hidden" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      const note = new Notification(n.title, { body: n.body.slice(0, 140), tag: n.tag, icon: "/icon.svg", silent: true });
      note.onclick = () => {
        window.focus();
        note.close();
      };
    } catch {
      // Some mobile browsers only allow notifications from a service worker.
    }
  }
}

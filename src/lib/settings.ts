import { z } from "zod";

export const SOUNDS = [
  { id: "ting", label: "Ting" },
  { id: "pop", label: "Pop" },
  { id: "chime", label: "Chime" },
  { id: "bubble", label: "Bubble" },
  { id: "marimba", label: "Marimba" },
  { id: "knock", label: "Knock" },
  { id: "none", label: "No sound" },
] as const;

export type SoundId = (typeof SOUNDS)[number]["id"];

export const settingsSchema = z.object({
  sound: z.enum(SOUNDS.map((s) => s.id) as [SoundId, ...SoundId[]]).catch("ting"),
  volume: z.number().min(0).max(1).catch(0.6),
  /** Ring for messages in the global chat and text rooms. */
  ringGroup: z.boolean().catch(true),
  /** Ring for direct messages. */
  ringDirect: z.boolean().catch(true),
  /** Ring for chat messages during calls. */
  ringCalls: z.boolean().catch(true),
  /** Show a system notification when the tab is in the background. */
  desktop: z.boolean().catch(false),
  /** Enter sends; Shift+Enter adds a line. Off: Ctrl/Cmd+Enter sends. */
  enterToSend: z.boolean().catch(true),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/** Reads saved settings, filling in anything missing or invalid with the defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    return settingsSchema.parse(typeof value === "object" && value ? value : {});
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Whether a new message should make a sound, given what the person is looking at. */
export function shouldRing(
  s: Settings,
  kind: "group" | "direct" | "call",
  watching: boolean,
): boolean {
  if (s.sound === "none" || s.volume === 0 || watching) return false;
  return kind === "group" ? s.ringGroup : kind === "direct" ? s.ringDirect : s.ringCalls;
}

import { z } from "zod";
import type { AvatarColorId } from "./profile";

export const QUEUE_ROOM = "zaproom-strangers-queue";
/** The always-open global text chat. */
export const LOUNGE_ROOM = "zaproom-lounge";

export type RoomKind = "video" | "voice" | "text";

/** People per room: calls stay small enough for a grid; text rooms can be bigger. */
export function roomLimit(kind: RoomKind): number {
  return kind === "text" ? 50 : 12;
}

/** Letters and digits that can't be mistaken for each other (no 0/o, 1/l/i). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Room ids look like `k7f-2qxm-9zd`: 10 random characters, ~49 bits. */
export function newRoomId(random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(10);
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
    if (i === 2 || i === 6) id += "-";
  }
  return id;
}

function defaultRandom(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export const ROOM_ID = /^(?:[a-z2-9]{3}-[a-z2-9]{4}-[a-z2-9]{3}|s-[a-f0-9]{16})$/;

export function isRoomId(value: unknown): value is string {
  return typeof value === "string" && ROOM_ID.test(value);
}

export const roomMetaSchema = z.object({
  v: z.literal(1),
  title: z.string(),
  topic: z.string().default(""),
  visibility: z.enum(["public", "private", "stranger"]),
  kind: z.enum(["video", "voice", "text"]),
  createdAt: z.number(),
});
export type RoomMeta = z.infer<typeof roomMetaSchema>;

export function encodeMeta(meta: RoomMeta): string {
  return JSON.stringify(meta);
}

/** Returns null for rooms Zaproom didn't create (or metadata it can't read). */
export function parseMeta(raw: string | undefined | null): RoomMeta | null {
  if (!raw) return null;
  try {
    const parsed = roomMetaSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type PublicPerson = { name: string; color: AvatarColorId };

export type LobbyRoom = {
  id: string;
  title: string;
  topic: string;
  kind: RoomKind;
  count: number;
  people: PublicPerson[];
  createdAt: number;
};

export type LobbySnapshot = {
  configured: boolean;
  rooms: LobbyRoom[];
  /** Everyone in any Zaproom room right now, private rooms included (counted, not named). */
  online: number;
  /** People waiting to be matched with a stranger. */
  waiting: number;
  /** People in the global chat. */
  chatting: number;
};

/** Busy rooms first, then newest. */
export function sortLobby(rooms: LobbyRoom[]): LobbyRoom[] {
  return [...rooms].sort((a, b) => b.count - a.count || b.createdAt - a.createdAt);
}

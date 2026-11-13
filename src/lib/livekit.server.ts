import "server-only";
import { AccessToken, RoomServiceClient, TrackSource, type ParticipantInfo } from "livekit-server-sdk";
import type { LiveKitConfig } from "./config";
import { colorSchema, type Profile } from "./profile";
import {
  LOUNGE_ROOM,
  QUEUE_ROOM,
  encodeMeta,
  parseMeta,
  roomLimit,
  sortLobby,
  type LobbyRoom,
  type LobbySnapshot,
  type RoomMeta,
} from "./rooms";
import type { QueueEntry } from "./pairing";

const LOBBY_LIMIT = 24;

/** LiveKit's REST API lives on the same host as the WebSocket URL. */
function service(cfg: LiveKitConfig): RoomServiceClient {
  return new RoomServiceClient(cfg.url.replace(/^ws/, "http"), cfg.apiKey, cfg.apiSecret);
}

export async function createRoom(cfg: LiveKitConfig, id: string, meta: RoomMeta): Promise<void> {
  const stranger = meta.visibility === "stranger";
  await service(cfg).createRoom({
    name: id,
    metadata: encodeMeta(meta),
    maxParticipants: stranger ? 2 : roomLimit(meta.kind),
    // Close a room nobody joined after 5 minutes (stranger rooms: 1), and an emptied one after 1.
    emptyTimeout: stranger ? 60 : 300,
    departureTimeout: stranger ? 10 : 60,
  });
}

export async function getRoom(cfg: LiveKitConfig, id: string): Promise<{ meta: RoomMeta; count: number } | null> {
  const svc = service(cfg);
  const [room] = await svc.listRooms([id]);
  const meta = parseMeta(room?.metadata);
  if (!room || !meta) return null;
  // The room's own counter can trail joins by a few seconds; the participant list doesn't.
  const people = await svc.listParticipants(id).catch(() => null);
  return { meta, count: people ? people.filter(isPresent).length : room.numParticipants };
}

export async function lobbySnapshot(cfg: LiveKitConfig): Promise<LobbySnapshot> {
  const svc = service(cfg);
  const all = await svc.listRooms();
  let online = 0;
  let waiting = 0;
  let chatting = 0;
  const publicRooms: { id: string; meta: RoomMeta; count: number }[] = [];

  for (const room of all) {
    if (room.name === QUEUE_ROOM) {
      waiting = room.numParticipants;
      continue;
    }
    if (room.name === LOUNGE_ROOM) {
      chatting = room.numParticipants;
      continue;
    }
    const meta = parseMeta(room.metadata);
    if (!meta) continue;
    online += room.numParticipants;
    if (meta.visibility === "public") publicRooms.push({ id: room.name, meta, count: room.numParticipants });
  }

  const shown = sortLobby(
    publicRooms.map(({ id, meta, count }) => ({
      id,
      title: meta.title,
      topic: meta.topic,
      kind: meta.kind,
      count,
      people: [],
      createdAt: meta.createdAt,
    })),
  ).slice(0, LOBBY_LIMIT);

  // Names and colours only for rooms people chose to make public.
  const withPeople: LobbyRoom[] = await Promise.all(
    shown.map(async (room) => {
      if (room.count === 0) return room;
      const people = await svc.listParticipants(room.id).catch(() => []);
      return { ...room, people: people.filter(isPresent).slice(0, 8).map(publicPerson) };
    }),
  );

  return { configured: true, rooms: withPeople, online, waiting, chatting };
}

function isPresent(p: ParticipantInfo): boolean {
  // ParticipantInfo_State.DISCONNECTED === 3
  return Number(p.state) !== 3;
}

function publicPerson(p: ParticipantInfo) {
  const color = colorSchema.safeParse(p.attributes?.color);
  return { name: p.name || "Guest", color: color.success ? color.data : "tangerine" };
}

type TokenOptions = {
  roomId: string;
  identity: string;
  profile: Profile;
  kind: RoomMeta["kind"];
  /** Queue tokens can't publish anything; they only hold a place in line. */
  listenOnly?: boolean;
};

const CALL_SOURCES = [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];
const VOICE_SOURCES = [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];

export async function mintToken(cfg: LiveKitConfig, opts: TokenOptions): Promise<string> {
  const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: opts.identity,
    name: opts.profile.name,
    attributes: { color: opts.profile.color },
    ttl: "2h",
  });
  token.addGrant({
    room: opts.roomId,
    roomJoin: true,
    roomCreate: false,
    canSubscribe: !opts.listenOnly,
    // Text rooms and the global chat only send data packets, never audio or video.
    canPublish: !opts.listenOnly && opts.kind !== "text",
    canPublishData: !opts.listenOnly,
    canUpdateOwnMetadata: false,
    canPublishSources: opts.listenOnly || opts.kind === "text" ? [] : opts.kind === "voice" ? VOICE_SOURCES : CALL_SOURCES,
  });
  return token.toJwt();
}

export async function queueEntries(cfg: LiveKitConfig): Promise<{ entries: QueueEntry[]; infos: ParticipantInfo[] }> {
  const infos = (await service(cfg).listParticipants(QUEUE_ROOM).catch(() => [])).filter(isPresent);
  const entries = infos.map((p) => ({
    identity: p.identity,
    joinedAtMs: Number(p.joinedAtMs || BigInt(p.joinedAt) * 1000n),
    matchedRoom: p.attributes?.match || undefined,
  }));
  return { entries, infos };
}

export async function ensureQueueRoom(cfg: LiveKitConfig): Promise<void> {
  // createRoom returns the existing room when it is already open.
  await service(cfg).createRoom({ name: QUEUE_ROOM, emptyTimeout: 600, maxParticipants: 500 });
}

export async function markMatched(cfg: LiveKitConfig, identity: string, roomId: string): Promise<void> {
  await service(cfg).updateParticipant(QUEUE_ROOM, identity, { attributes: { match: roomId } });
}

export async function ensureLoungeRoom(cfg: LiveKitConfig): Promise<void> {
  await service(cfg).createRoom({ name: LOUNGE_ROOM, emptyTimeout: 600, departureTimeout: 30, maxParticipants: 1000 });
}

export type AdminParticipant = { identity: string; name: string; joinedAt: number; publishing: string[] };
export type AdminRoom = {
  id: string;
  label: string;
  meta: RoomMeta | null;
  kind: "room" | "stranger" | "lounge" | "queue";
  createdAt: number;
  people: AdminParticipant[];
};

/** Every open room, private and stranger rooms included, with who is in each. For the admin only. */
export async function adminRooms(cfg: LiveKitConfig): Promise<AdminRoom[]> {
  const svc = service(cfg);
  const rooms = await svc.listRooms();
  const out = await Promise.all(
    rooms.map(async (room): Promise<AdminRoom> => {
      const meta = parseMeta(room.metadata);
      const people = await svc.listParticipants(room.name).catch(() => []);
      const kind =
        room.name === LOUNGE_ROOM ? "lounge" : room.name === QUEUE_ROOM ? "queue" : meta?.visibility === "stranger" ? "stranger" : "room";
      const label =
        kind === "lounge" ? "Global chat" : kind === "queue" ? "Waiting for a stranger" : kind === "stranger" ? "Stranger chat" : (meta?.title ?? room.name);
      return {
        id: room.name,
        label,
        meta,
        kind,
        createdAt: Number(room.creationTime) * 1000,
        people: people.filter(isPresent).map((p) => ({
          identity: p.identity,
          name: p.name || p.identity,
          joinedAt: Number(p.joinedAt) * 1000,
          publishing: p.tracks.map((t) => (t.source === TrackSource.SCREEN_SHARE ? "screen" : t.type === 1 ? "camera" : "mic")),
        })),
      };
    }),
  );
  const order = { lounge: 0, room: 1, stranger: 2, queue: 3 } as const;
  return out.sort((a, b) => order[a.kind] - order[b.kind] || b.people.length - a.people.length);
}

export async function closeRoom(cfg: LiveKitConfig, id: string): Promise<void> {
  await service(cfg).deleteRoom(id);
}

export async function removePerson(cfg: LiveKitConfig, room: string, identity: string): Promise<void> {
  await service(cfg).removeParticipant(room, identity);
}

"use client";

import { useParticipants, useRoomContext } from "@livekit/components-react";
import { RoomEvent, type Participant, type RemoteParticipant } from "livekit-client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { CHAT_TOPIC, TYPING_TOPIC, decodePacket, encodePacket, newMessageId, prepareText } from "@/lib/chat/protocol";
import {
  GROUP,
  chatReducer,
  dmKey,
  emptyState,
  forStorage,
  isDm,
  lastIncomingId,
  peerOf,
  type ChatMessage,
  type ChatState,
  type Person,
} from "@/lib/chat/state";
import { notify } from "../settings/notify";

type Options = {
  /** Where direct messages are kept on this device; omit to keep nothing. */
  storageKey?: string;
  groupName: string;
  /** Show "Sara joined" lines in the group (text rooms, not the busy global chat). */
  announceJoins: boolean;
};

const TYPING_MS = 4000;
const SEND_WINDOW_MS = 6000;
const SEND_LIMIT = 6;

const visibleStore = {
  subscribe(cb: () => void) {
    document.addEventListener("visibilitychange", cb);
    window.addEventListener("focus", cb);
    window.addEventListener("blur", cb);
    return () => {
      document.removeEventListener("visibilitychange", cb);
      window.removeEventListener("focus", cb);
      window.removeEventListener("blur", cb);
    };
  },
  get: () => document.visibilityState === "visible",
};

export function toPerson(p: Participant): Person {
  return { identity: p.identity, name: p.name || "Guest", color: p.attributes?.color ?? "lilac" };
}

function loadSaved(storageKey: string | undefined, me: string): ChatState {
  if (!storageKey) return emptyState();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return emptyState();
    const saved = JSON.parse(raw) as { identity?: string; state?: ChatState };
    if (saved.identity !== me || !saved.state?.convos) return emptyState();
    return { ...saved.state, active: GROUP };
  } catch {
    return emptyState();
  }
}

export function useChatEngine({ storageKey, groupName, announceJoins }: Options) {
  const room = useRoomContext();
  const me = room.localParticipant.identity;
  const [state, dispatch] = useReducer(chatReducer, undefined, () => loadSaved(storageKey, me));
  const participants = useParticipants();
  const visible = useSyncExternalStore(visibleStore.subscribe, visibleStore.get, () => true);
  const [typing, setTyping] = useState<Record<string, Record<string, number>>>({});
  const [error, setError] = useState<string | null>(null);

  // Handlers registered once read the latest view through refs (updated after render).
  const view = useRef({ active: state.active, visible, groupName });
  useEffect(() => {
    view.current = { active: state.active, visible, groupName };
  }, [state.active, visible, groupName]);

  const online = useMemo(
    () =>
      participants
        .filter((p) => !p.isLocal)
        .map(toPerson)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [participants],
  );
  const onlineIds = useMemo(() => new Set(online.map((p) => p.identity)), [online]);

  // Incoming packets.
  useEffect(() => {
    const onData = (payload: Uint8Array, from?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (!from) return;
      const packet = decodePacket(payload);
      if (!packet) return;

      // Read at arrival time: the identity is fixed for this connection.
      const self = room.localParticipant.identity;
      if (topic === TYPING_TOPIC && packet.t === "typing") {
        if (packet.to && packet.to !== self) return;
        const key = packet.to ? dmKey(from.identity) : GROUP;
        setTyping((t) => ({ ...t, [key]: { ...t[key], [from.identity]: Date.now() + TYPING_MS } }));
        return;
      }
      if (topic !== CHAT_TOPIC) return;

      if (packet.t === "msg") {
        if (packet.to && packet.to !== self) return;
        const key = packet.to ? dmKey(from.identity) : GROUP;
        const person = toPerson(from);
        const message: ChatMessage = {
          id: packet.id,
          from: from.identity,
          name: person.name,
          color: person.color,
          text: packet.text,
          at: Date.now(),
          mine: false,
        };
        const watching = view.current.visible && view.current.active === key;
        dispatch({ type: "message", key, message, peer: packet.to ? person : undefined, focused: view.current.visible });
        setTyping((t) => {
          if (!t[key]?.[from.identity]) return t;
          const rest = { ...t[key] };
          delete rest[from.identity];
          return { ...t, [key]: rest };
        });
        notify({
          kind: packet.to ? "direct" : "group",
          watching,
          title: packet.to ? person.name : `${person.name} in ${view.current.groupName}`,
          body: packet.text,
          tag: key,
        });
      } else if (packet.t === "seen") {
        dispatch({ type: "seen", key: dmKey(from.identity), upTo: packet.upTo });
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  // "Sara joined" / "Sara left" lines.
  useEffect(() => {
    if (!announceJoins) return;
    const line = (p: Participant, verb: string) =>
      dispatch({
        type: "message",
        key: GROUP,
        focused: true,
        message: {
          id: `sys-${verb}-${p.identity.slice(-8)}-${Date.now()}`.slice(0, 40),
          from: "system",
          name: "",
          color: "lilac",
          text: `${p.name || "Someone"} ${verb}`,
          at: Date.now(),
          mine: false,
          system: true,
        },
      });
    const joined = (p: Participant) => line(p, "joined");
    const left = (p: Participant) => line(p, "left");
    room.on(RoomEvent.ParticipantConnected, joined).on(RoomEvent.ParticipantDisconnected, left);
    return () => {
      room.off(RoomEvent.ParticipantConnected, joined).off(RoomEvent.ParticipantDisconnected, left);
    };
  }, [room, announceJoins]);

  // Expire typing indicators.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTyping((t) => {
        let changed = false;
        const next: typeof t = {};
        for (const [key, who] of Object.entries(t)) {
          const live = Object.fromEntries(Object.entries(who).filter(([, until]) => until > now));
          if (Object.keys(live).length !== Object.keys(who).length) changed = true;
          if (Object.keys(live).length) next[key] = live;
        }
        return changed ? next : t;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Opening a conversation (or coming back to the tab) marks it read.
  useEffect(() => {
    if (visible) dispatch({ type: "read", key: state.active });
  }, [visible, state.active]);

  // "Seen" receipts for direct messages you're looking at.
  const lastSeenSent = useRef<Record<string, string>>({});
  const activeConvo = state.convos[state.active];
  const newestIncoming = lastIncomingId(activeConvo);
  useEffect(() => {
    if (!visible || !isDm(state.active) || !newestIncoming) return;
    const peer = peerOf(state.active);
    if (lastSeenSent.current[peer] === newestIncoming || !onlineIds.has(peer)) return;
    lastSeenSent.current[peer] = newestIncoming;
    void room.localParticipant
      .publishData(encodePacket({ t: "seen", upTo: newestIncoming }), {
        reliable: true,
        topic: CHAT_TOPIC,
        destinationIdentities: [peer],
      })
      .catch(() => {});
  }, [visible, state.active, newestIncoming, onlineIds, room]);

  // Keep direct messages on this device (the global chat isn't saved).
  useEffect(() => {
    if (!storageKey) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ identity: me, state: forStorage(state) }));
      } catch {
        // Storage full or blocked: history lasts for this visit only.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [state, storageKey, me]);

  const sentAt = useRef<number[]>([]);
  const send = useCallback(
    async (raw: string): Promise<boolean> => {
      const prepared = prepareText(raw);
      if ("error" in prepared) {
        setError(prepared.error);
        return false;
      }
      const now = Date.now();
      sentAt.current = sentAt.current.filter((t) => t > now - SEND_WINDOW_MS);
      if (sentAt.current.length >= SEND_LIMIT) {
        setError("You're sending messages very fast. Wait a few seconds.");
        return false;
      }
      const key = state.active;
      const to = isDm(key) ? peerOf(key) : undefined;
      if (to && !onlineIds.has(to)) {
        setError("They're offline, so this message can't be delivered.");
        return false;
      }
      const id = newMessageId();
      try {
        await room.localParticipant.publishData(encodePacket({ t: "msg", id, text: prepared.text, to }), {
          reliable: true,
          topic: CHAT_TOPIC,
          destinationIdentities: to ? [to] : undefined,
        });
      } catch {
        setError("Message didn't send. Check your connection and try again.");
        return false;
      }
      sentAt.current.push(now);
      const meP = toPerson(room.localParticipant);
      dispatch({
        type: "message",
        key,
        focused: true,
        message: { id, from: me, name: meP.name, color: meP.color, text: prepared.text, at: now, mine: true, seen: false },
      });
      setError(null);
      return true;
    },
    [room, me, state.active, onlineIds],
  );

  // Per conversation, so typing in the group doesn't silence a private chat right after.
  const lastTypingSent = useRef<Record<string, number>>({});
  const sendTyping = useCallback(() => {
    const now = Date.now();
    const key = state.active;
    if (now - (lastTypingSent.current[key] ?? 0) < 2500) return;
    lastTypingSent.current[key] = now;
    const to = isDm(key) ? peerOf(key) : undefined;
    if (to && !onlineIds.has(to)) return;
    void room.localParticipant
      // Reliable: a few bytes every 2.5 s at most, and lossy delivery can be skipped
      // entirely on some networks.
      .publishData(encodePacket({ t: "typing", to }), {
        reliable: true,
        topic: TYPING_TOPIC,
        destinationIdentities: to ? [to] : undefined,
      })
      .catch(() => {});
  }, [room, state.active, onlineIds]);

  const open = useCallback(
    (key: string) => {
      const peer = isDm(key) ? (online.find((p) => p.identity === peerOf(key)) ?? state.convos[key]?.peer) : undefined;
      dispatch({ type: "open", key, peer });
      setError(null);
    },
    [online, state.convos],
  );

  const clearHistory = useCallback(() => {
    dispatch({ type: "clear" });
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Nothing saved.
      }
    }
  }, [storageKey]);

  const typingNames = useCallback(
    (key: string): string[] => {
      const who = typing[key];
      if (!who) return [];
      return Object.keys(who)
        .map((id) => online.find((p) => p.identity === id)?.name)
        .filter((n): n is string => Boolean(n));
    },
    [typing, online],
  );

  return { me, state, online, onlineIds, send, sendTyping, open, typingNames, error, setError, clearHistory };
}

export type ChatEngine = ReturnType<typeof useChatEngine>;

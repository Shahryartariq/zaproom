"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallback, useState } from "react";

export const REACTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🔥", label: "Fire" },
] as const;

const ALLOWED = new Set<string>(REACTIONS.map((r) => r.emoji));
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Floater = { id: number; emoji: string; name: string; x: number };
let seq = 0;

/** Emoji reactions over the data channel. Only the six known emoji are ever shown. */
export function useReactions() {
  const [items, setItems] = useState<Floater[]>([]);

  const show = useCallback((emoji: string, name: string) => {
    if (!ALLOWED.has(emoji)) return;
    const id = ++seq;
    setItems((cur) => [...cur.slice(-14), { id, emoji, name, x: 8 + Math.random() * 80 }]);
    setTimeout(() => setItems((cur) => cur.filter((f) => f.id !== id)), 3300);
  }, []);

  const { send } = useDataChannel("reactions", (msg) => {
    try {
      const { e } = JSON.parse(decoder.decode(msg.payload)) as { e?: string };
      if (typeof e === "string") show(e, msg.from?.name || "Someone");
    } catch {
      // Ignore anything that isn't a reaction.
    }
  });

  const sendReaction = useCallback(
    (emoji: string) => {
      show(emoji, "You");
      void send(encoder.encode(JSON.stringify({ e: emoji })), { reliable: false, topic: "reactions" }).catch(() => {});
    },
    [send, show],
  );

  return { items, send: sendReaction };
}

export function Reactions({ items }: { items: Floater[] }) {
  return (
    <div className="reactions-layer" aria-hidden="true">
      {items.map((f) => (
        <span key={f.id} className={`floater x${Math.round(f.x / 10)}`}>
          <b>{f.emoji}</b>
          <small>{f.name}</small>
        </span>
      ))}
    </div>
  );
}

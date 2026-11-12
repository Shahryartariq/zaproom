import { z } from "@/lib/zod";

/**
 * Text chat travels over LiveKit data packets. The SFU stamps every packet with the
 * sender's identity from their signed token, so "who sent this" can't be faked.
 * Direct messages use `destinationIdentities`, so the server only delivers them to
 * the one person they're for.
 */

export const CHAT_TOPIC = "zr.chat";
export const TYPING_TOPIC = "zr.typing";
export const MAX_TEXT = 1000;

const id = z.string().regex(/^[a-zA-Z0-9-]{8,40}$/);

const messagePacket = z.object({
  t: z.literal("msg"),
  id,
  text: z.string().min(1).max(MAX_TEXT),
  /** Set for direct messages: the recipient's identity. */
  to: z.string().max(64).optional(),
});

const seenPacket = z.object({ t: z.literal("seen"), upTo: id });
const typingPacket = z.object({ t: z.literal("typing"), to: z.string().max(64).optional() });

export const packetSchema = z.discriminatedUnion("t", [messagePacket, seenPacket, typingPacket]);
export type Packet = z.infer<typeof packetSchema>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodePacket(p: Packet): Uint8Array<ArrayBuffer> {
  return encoder.encode(JSON.stringify(p)) as Uint8Array<ArrayBuffer>;
}

/** Returns null for anything malformed, oversized or unknown. Never throws. */
export function decodePacket(bytes: Uint8Array): Packet | null {
  if (bytes.byteLength > 4 * MAX_TEXT + 256) return null;
  try {
    const parsed = packetSchema.safeParse(JSON.parse(decoder.decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Trims and checks a message before sending. Returns the text or an error to show. */
export function prepareText(raw: string): { text: string } | { error: string } {
  const text = raw.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!text) return { error: "Type a message first." };
  if (text.length > MAX_TEXT) return { error: `Keep messages under ${MAX_TEXT.toLocaleString("en")} characters.` };
  return { text };
}

export function newMessageId(): string {
  return crypto.randomUUID();
}

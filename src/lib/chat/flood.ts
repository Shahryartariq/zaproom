/**
 * Messages travel straight between browsers through LiveKit, so the server can't rate-limit
 * them. Each receiver does it instead: a sender who goes over the limit (a modified client,
 * a script) is ignored for the rest of the window, so they can't flood the chat, the
 * notification sound or the screen with reactions.
 */
export class SenderLimit {
  private seen = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** True if this packet from `sender` should be shown. */
  allow(sender: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.seen.get(sender) ?? []).filter((t) => t > since);
    const ok = recent.length < this.max;
    if (ok) recent.push(now);
    this.seen.set(sender, recent);
    if (this.seen.size > 500) {
      for (const [key, times] of this.seen) if (!times.some((t) => t > since)) this.seen.delete(key);
    }
    return ok;
  }
}

/** A little above what a fast typist can send by hand (the sender's own limit is 6 per 6 s). */
export const MESSAGE_LIMIT = { max: 10, windowMs: 10_000 };
export const REACTION_LIMIT = { max: 8, windowMs: 4_000 };

/** The same limit applied to a message list (the in-call chat keeps its own list). */
export function limitBySender<T extends { timestamp: number; from?: { identity: string } }>(
  messages: readonly T[],
  max = MESSAGE_LIMIT.max,
  windowMs = MESSAGE_LIMIT.windowMs,
): T[] {
  const limit = new SenderLimit(max, windowMs);
  return messages.filter((m) => !m.from || limit.allow(m.from.identity, m.timestamp));
}

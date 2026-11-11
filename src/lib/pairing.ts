export type QueueEntry = {
  identity: string;
  joinedAtMs: number;
  /** Set once the server has paired this person; the room they should join. */
  matchedRoom?: string;
};

export type MatchResult =
  | { status: "matched"; roomId: string }
  | { status: "pair"; partner: string }
  | { status: "waiting"; ahead: number }
  | { status: "absent" };

/**
 * Pairs people in the order they joined the queue: 1st with 2nd, 3rd with 4th...
 *
 * Every request computes the same pairs from the same queue, so two people asking
 * at the same moment end up in the same room without any shared server memory.
 */
export function findMatch(entries: QueueEntry[], me: string): MatchResult {
  const mine = entries.find((e) => e.identity === me);
  if (!mine) return { status: "absent" };
  if (mine.matchedRoom) return { status: "matched", roomId: mine.matchedRoom };

  const waiting = entries
    .filter((e) => !e.matchedRoom)
    .sort((a, b) => a.joinedAtMs - b.joinedAtMs || a.identity.localeCompare(b.identity));

  const index = waiting.findIndex((e) => e.identity === me);
  const partner = waiting[index ^ 1];
  if (!partner) return { status: "waiting", ahead: index };
  return { status: "pair", partner: partner.identity };
}

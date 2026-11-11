import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * A ticket proves "the server put this identity in the stranger queue". Without it,
 * anyone could poll the match endpoint with someone else's identity and take their call.
 */
export function signTicket(identity: string, secret: string, now = Date.now(), ttlMs = 30 * 60_000): string {
  const exp = Math.floor((now + ttlMs) / 1000);
  const body = `${identity}.${exp}`;
  return `${body}.${mac(body, secret)}`;
}

export function verifyTicket(ticket: unknown, secret: string, now = Date.now()): string | null {
  if (typeof ticket !== "string" || ticket.length > 200) return null;
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [identity, exp, sig] = parts as [string, string, string];
  if (!/^st_[a-f0-9-]{36}$/.test(identity) || !/^\d{1,12}$/.test(exp)) return null;
  const expected = Buffer.from(mac(`${identity}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) * 1000 < now) return null;
  return identity;
}

function mac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Same two people → same room, whichever of them asks first. */
export function strangerRoomId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `s-${createHash("sha256").update(`${x}|${y}`).digest("hex").slice(0, 16)}`;
}

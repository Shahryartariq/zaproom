import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "zr_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

/** The admin password from ADMIN_PASSWORD, or null when the panel is switched off (too short or unset). */
export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length >= 12 ? value : null;
}

/**
 * Passwords only ever go through scrypt, a deliberately slow hash, so a leaked signing key
 * or log can't be turned back into the password cheaply.
 */
function derive(password: string): Buffer {
  const pepper = process.env.ADMIN_SESSION_SECRET ?? process.env.LIVEKIT_API_SECRET ?? "";
  return scryptSync(password, `zaproom-admin-v1\0${pepper}`, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

// The configured password's derived key, worked out once per server instance.
let derived: { password: string; value: Buffer } | null = null;
function passwordKey(password: string): Buffer {
  if (derived?.password !== password) derived = { password, value: derive(password) };
  return derived.value;
}

/** Signing key for sessions: changes with the password, so a new password signs everyone out. */
const sign = (password: string, data: string) =>
  createHmac("sha256", passwordKey(password)).update(`session\0${data}`).digest("base64url");

function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(a, "base64url");
  const y = Buffer.from(b, "base64url");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export function checkPassword(attempt: string): boolean {
  const password = adminPassword();
  if (!password || attempt.length === 0 || attempt.length > 200) return false;
  return timingSafeEqual(derive(attempt), passwordKey(password));
}

/** A session token: expiry time plus a signature over it. */
export function createSession(now = Date.now()): string {
  const password = adminPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const exp = String(Math.floor(now / 1000) + ADMIN_SESSION_SECONDS);
  return `${exp}.${sign(password, exp)}`;
}

export function verifySession(token: string | undefined, now = Date.now()): boolean {
  const password = adminPassword();
  if (!password || !token) return false;
  const [exp, signature] = token.split(".");
  if (!exp || !signature || !/^\d{9,11}$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  return sameSignature(signature, sign(password, exp));
}

export async function isAdminRequest(): Promise<boolean> {
  return verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** For admin pages: sends anyone without a session to the sign-in page. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminRequest())) redirect("/admin/login");
}

export function sessionCookie(value: string, maxAge: number) {
  return {
    name: ADMIN_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

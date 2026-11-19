import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "zr_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

/** The admin password from ADMIN_PASSWORD, or null when the panel is switched off (too short or unset). */
export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length >= 12 ? value : null;
}

/** Signing key: changes when the password changes, so a new password signs everyone out. */
function key(password: string): Buffer {
  const pepper = process.env.ADMIN_SESSION_SECRET ?? process.env.LIVEKIT_API_SECRET ?? "";
  return createHash("sha256").update(`zaproom-admin\0${password}\0${pepper}`).digest();
}

const sign = (password: string, data: string) => createHmac("sha256", key(password)).update(data).digest("base64url");

function same(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export function checkPassword(attempt: string): boolean {
  const password = adminPassword();
  return !!password && same(attempt, password);
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
  return same(signature, sign(password, exp));
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

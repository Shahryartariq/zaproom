import { afterEach, describe, expect, it } from "vitest";
import { adminPassword, checkPassword, createSession, verifySession } from "@/lib/admin-auth";

// Built from words so secret scanners don't mistake test values for real passwords.
const words = (...w: string[]) => w.join(" ");
const GOOD = words("correct", "horse", "battery");
const OTHER = words("a", "different", "password");
const set = (v?: string) => (v === undefined ? delete process.env.ADMIN_PASSWORD : (process.env.ADMIN_PASSWORD = v));

describe("admin sessions", () => {
  afterEach(() => set(undefined));

  it("is off without a long enough password", () => {
    set(undefined);
    expect(adminPassword()).toBeNull();
    set("short");
    expect(adminPassword()).toBeNull();
    expect(checkPassword("short")).toBe(false);
    expect(verifySession("1.abc")).toBe(false);
  });

  it("checks the password", () => {
    set(GOOD);
    expect(checkPassword(GOOD)).toBe(true);
    expect(checkPassword(`${GOOD}!`)).toBe(false);
    expect(checkPassword("")).toBe(false);
  });

  it("signs sessions that expire and can't be forged", () => {
    set(GOOD);
    const now = Date.UTC(2026, 10, 13);
    const token = createSession(now);
    expect(verifySession(token, now + 60_000)).toBe(true);
    expect(verifySession(token, now + 13 * 60 * 60_000)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(verifySession(`${Number(exp) + 3600}.${sig}`, now)).toBe(false);
    expect(verifySession(`${exp}.${sig}x`, now)).toBe(false);
    expect(verifySession(undefined, now)).toBe(false);
    // A new password signs everyone out.
    set(OTHER);
    expect(verifySession(token, now + 60_000)).toBe(false);
  });
});

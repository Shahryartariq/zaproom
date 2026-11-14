import { afterEach, describe, expect, it, vi } from "vitest";
import { SenderLimit, limitBySender } from "@/lib/chat/flood";
import { failure, postJson, readJson } from "@/lib/fetch-json";
import { sameOrigin } from "@/lib/http";

describe("SenderLimit", () => {
  it("lets each sender through up to the limit per window", () => {
    const limit = new SenderLimit(3, 1000);
    expect([0, 1, 2, 3].map((t) => limit.allow("a", t))).toEqual([true, true, true, false]);
    expect(limit.allow("b", 3)).toBe(true);
    expect(limit.allow("a", 1001)).toBe(true);
  });
  it("filters a flooded message list but keeps normal senders", () => {
    const flood = Array.from({ length: 30 }, (_, i) => ({ timestamp: i * 10, from: { identity: "spammer" } }));
    const normal = [{ timestamp: 50, from: { identity: "friend" } }, { timestamp: 60 }];
    const kept = limitBySender([...flood, ...normal].sort((a, b) => a.timestamp - b.timestamp));
    expect(kept.filter((m) => m.from?.identity === "spammer")).toHaveLength(10);
    expect(kept.filter((m) => m.from?.identity !== "spammer")).toHaveLength(2);
  });
});

describe("readJson and failure", () => {
  it("never throws on an HTML error page", async () => {
    const res = new Response("<html>Bad gateway</html>", { status: 502 });
    const data = await readJson(res);
    expect(data).toEqual({});
    expect(failure(res, data, "fallback")).toMatch(/server is having trouble/);
  });
  it("uses the server's own message, or one for the status", async () => {
    expect(failure(new Response(null, { status: 400 }), { error: "Room is full." }, "x")).toBe("Room is full.");
    expect(failure(new Response(null, { status: 429 }), {}, "x")).toMatch(/Wait a minute/);
    expect(failure(new Response(null, { status: 403 }), {}, "Couldn't join.")).toBe("Couldn't join.");
  });
});

describe("postJson", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("turns network failures and bad answers into plain messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await postJson("/x", {}, "nope")).toEqual({ ok: false, status: 0, error: expect.stringMatching(/Couldn't reach Zaproom/) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You can't join right now." }), { status: 403 })));
    expect(await postJson("/x", {}, "nope")).toMatchObject({ ok: false, status: 403, error: "You can't join right now." });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 201 })));
    expect(await postJson<{ id: string }>("/x", {}, "nope")).toEqual({ ok: true, data: { id: "abc" } });
  });
});

describe("sameOrigin", () => {
  const req = (h: Record<string, string>) => new Request("https://zaproom.vercel.app/api/x", { method: "POST", headers: { host: "zaproom.vercel.app", ...h } });
  it("refuses cross-site requests, by Sec-Fetch-Site or by Origin", () => {
    expect(sameOrigin(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(sameOrigin(req({ "sec-fetch-site": "same-site", origin: "https://zaproom.vercel.app" }))).toBe(false);
    expect(sameOrigin(req({ origin: "https://evil.example" }))).toBe(false);
  });
  it("allows the site's own requests", () => {
    expect(sameOrigin(req({ "sec-fetch-site": "same-origin", origin: "https://zaproom.vercel.app" }))).toBe(true);
    expect(sameOrigin(req({ origin: "https://zaproom.vercel.app" }))).toBe(true);
  });
});

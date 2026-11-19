import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteVisitor, listVisitors, overview, visitorDetail, visitorsByIdentity } from "@/lib/admin.server";
import { closeDb, db } from "@/lib/db";
import { requestInfo } from "@/lib/visitors";
import { prune, recordEvent, recordLeave, recordView } from "@/lib/visitors.server";

// Runs against a real Postgres when TEST_DATABASE_URL is set (locally and in CI).
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("visitor log in Postgres", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  const S1 = "33333333-3333-4333-8333-333333333333";
  const S2 = "44444444-4444-4444-8444-444444444444";
  const lahore = requestInfo(
    new Headers({
      "x-forwarded-for": "203.0.113.7",
      "x-vercel-ip-country": "PK",
      "x-vercel-ip-city": "Lahore",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    }),
  );
  let sql: NonNullable<Awaited<ReturnType<typeof db>>>;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const fresh = (await import("postgres")).default(url!, { onnotice: () => {} });
    await fresh`drop table if exists zr_page_views, zr_events, zr_visitors`;
    await fresh.end();
    sql = (await db())!;
  });
  afterAll(() => closeDb());

  it("records visits, sessions, time and messages", async () => {
    const view = (path: string, session: string, newSession: boolean, info = lahore) =>
      recordView(sql, { visitorId: A, sessionId: session, newSession, info, host: "zaproom.vercel.app", view: { type: "view", path, title: "Zaproom", referrer: "https://www.linkedin.com/feed/", lang: "en-PK", screen: "1920x1080" } });
    const first = await view("/?utm_source=linkedin", S1, true);
    await recordLeave(sql, A, first, 30, 2);
    await recordLeave(sql, A, first, 45, 1); // same page reported again: only 15 s more
    await view("/chat", S1, false);
    await view("/strangers", S2, true, { ...lahore, ip: "198.51.100.9", city: "Islamabad" });

    const [v] = await sql`select * from zr_visitors where id = ${A}`;
    expect(v).toMatchObject({
      sessions: 2,
      page_views: 3,
      seconds: 45,
      messages: 3,
      ip: "198.51.100.9",
      ips: ["203.0.113.7", "198.51.100.9"],
      city: "Islamabad",
      first_landing: "/?utm_source=linkedin",
      first_referrer: "https://www.linkedin.com/feed/",
      utm_source: "linkedin",
      language: "en-PK",
      screen: "1920x1080",
      browser: "Chrome",
    });
    // Someone else's leave report can't touch A's page view.
    await recordLeave(sql, B, first, 999, 99);
    const [after] = await sql`select seconds from zr_visitors where id = ${A}`;
    expect(after?.seconds).toBe(45);
  });

  it("records events, names and identities", async () => {
    await recordEvent(sql, A, lahore, { type: "chat_joined", name: "Sherry", identity: "u_abc", room: "zaproom-lounge" });
    await recordEvent(sql, A, lahore, { type: "room_joined", name: "Sherry", identity: "g_1", room: "abc-defg-hij", detail: { title: "Book club" } });
    await recordEvent(sql, A, lahore, { type: "room_joined", name: "Sher", identity: "g_2", room: "abc-defg-hij" });
    await recordEvent(sql, null, lahore, { type: "admin_login_failed" });
    const [v] = await sql`select names from zr_visitors where id = ${A}`;
    expect(v?.names).toEqual(["Sherry", "Sher"]);
    const map = await visitorsByIdentity(sql, ["u_abc", "g_2", "nobody"]);
    expect([...map]).toEqual([["g_2", A], ["u_abc", A]].sort());
  });

  it("summarises, searches and shows one visitor", async () => {
    const bot = requestInfo(new Headers({ "user-agent": "Googlebot/2.1", "x-forwarded-for": "66.249.66.1" }));
    await recordView(sql, { visitorId: B, sessionId: S2, newSession: true, info: bot, host: null, view: { type: "view", path: "/" } });

    const o = await overview(sql, "7", false);
    expect(o).toMatchObject({ visitors: 1, newVisitors: 1, views: 3, messages: 3, bots: 1 });
    expect(o.avgSeconds).toBe(45);
    expect(o.events).toMatchObject({ chat_joined: 1, room_joined: 2, admin_login_failed: 1 });
    expect(o.days).toHaveLength(8);
    expect(o.days.at(-1)).toMatchObject({ visitors: 1, views: 3 });
    expect(o.countries).toEqual([{ label: "PK", count: 1 }]);
    expect(o.referrers).toEqual([{ label: "www.linkedin.com", count: 1 }]);
    expect(o.pages.map((p) => p.label).sort()).toEqual(["/", "/chat", "/strangers"]);
    expect((await overview(sql, "7", true)).visitors).toBe(2);

    expect((await listVisitors(sql, { q: "sherry" })).rows.map((r) => r.id)).toEqual([A]);
    expect((await listVisitors(sql, { q: "203.0.113" })).total).toBe(1);
    // The latest request decides the current city (events came from Lahore after the Islamabad view).
    expect((await listVisitors(sql, { q: "lahore" })).total).toBe(1);
    expect((await listVisitors(sql, { q: "%" })).total).toBe(0);
    expect((await listVisitors(sql, {})).total).toBe(1);
    expect((await listVisitors(sql, { bots: true })).total).toBe(2);

    const detail = await visitorDetail(sql, A);
    expect(detail?.timeline.filter((t) => t.kind === "view")).toHaveLength(3);
    expect(detail?.timeline.filter((t) => t.kind === "event")).toHaveLength(3);
    expect(await visitorDetail(sql, "55555555-5555-4555-8555-555555555555")).toBeNull();
  });

  it("deletes a visitor with everything recorded about them, and prunes old rows", async () => {
    expect(await deleteVisitor(sql, B)).toBe(true);
    expect((await sql`select count(*)::int as n from zr_page_views where visitor_id = ${B}`)[0]?.n).toBe(0);
    await sql`update zr_page_views set at = now() - interval '400 days' where path = '/chat'`;
    await prune(sql, 365);
    expect((await sql`select count(*)::int as n from zr_page_views where path = '/chat'`)[0]?.n).toBe(0);
    expect((await sql`select count(*)::int as n from zr_visitors`)[0]?.n).toBe(1);
  });
});

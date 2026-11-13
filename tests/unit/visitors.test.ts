import { describe, expect, it } from "vitest";
import { beaconSchema, csvCell, duration, externalReferrer, flag, isBot, requestInfo, utmFrom } from "@/lib/visitors";

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

describe("requestInfo", () => {
  it("reads the address, Vercel's location headers and the browser", () => {
    const info = requestInfo(
      new Headers({
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "x-vercel-ip-country": "PK",
        "x-vercel-ip-country-region": "PB",
        "x-vercel-ip-city": "S%C4%81rgodha",
        "x-vercel-ip-latitude": "32.08",
        "x-vercel-ip-longitude": "72.67",
        "x-vercel-ip-timezone": "Asia/Karachi",
        "user-agent": CHROME_WIN,
      }),
    );
    expect(info).toMatchObject({
      ip: "203.0.113.7",
      country: "PK",
      region: "PB",
      city: "Sārgodha",
      latitude: 32.08,
      longitude: 72.67,
      timezone: "Asia/Karachi",
      browser: "Chrome",
      os: "Windows",
      device: "desktop",
      isBot: false,
    });
  });
  it("knows phones and bots, and ignores junk headers", () => {
    expect(requestInfo(new Headers({ "user-agent": IPHONE }))).toMatchObject({ device: "mobile", os: "iOS", browser: "Mobile Safari" });
    expect(requestInfo(new Headers({ "user-agent": "Googlebot/2.1" }))).toMatchObject({ device: "bot", isBot: true });
    const junk = requestInfo(new Headers({ "x-vercel-ip-country": "pakistan", "x-vercel-ip-latitude": "999", "user-agent": CHROME_WIN }));
    expect(junk.country).toBeNull();
    expect(junk.latitude).toBeNull();
    expect(isBot(null)).toBe(true);
    expect(isBot(`${CHROME_WIN} HeadlessChrome`)).toBe(true);
  });
});

describe("helpers", () => {
  it("reads campaign tags and outside referrers", () => {
    expect(utmFrom("/?utm_source=linkedin&utm_medium=post")).toEqual({ source: "linkedin", medium: "post", campaign: null });
    expect(externalReferrer("https://www.linkedin.com/feed/", "zaproom.vercel.app")).toBe("https://www.linkedin.com/feed/");
    expect(externalReferrer("https://zaproom.vercel.app/chat", "zaproom.vercel.app")).toBeNull();
    expect(externalReferrer("not a url", "x")).toBeNull();
  });
  it("formats flags, durations and safe CSV cells", () => {
    expect(flag("PK")).toBe("🇵🇰");
    expect(flag("xx")).toBe("");
    expect(duration(45)).toBe("45s");
    expect(duration(200)).toBe("3m 20s");
    expect(duration(7500)).toBe("2h 5m");
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell(["a", "b"])).toBe('"a; b"');
    expect(csvCell(null)).toBe('""');
  });
  it("accepts page views and leave reports, nothing else", () => {
    expect(beaconSchema.safeParse({ type: "view", path: "/chat", screen: "1920x1080" }).success).toBe(true);
    expect(beaconSchema.safeParse({ type: "view", path: "https://evil.example" }).success).toBe(false);
    expect(beaconSchema.safeParse({ type: "leave", viewId: 3, seconds: 40 }).data).toEqual({ type: "leave", viewId: 3, seconds: 40, messages: 0 });
    expect(beaconSchema.safeParse({ type: "leave", viewId: 3, seconds: -1 }).success).toBe(false);
    expect(beaconSchema.safeParse({ type: "other" }).success).toBe(false);
  });
});

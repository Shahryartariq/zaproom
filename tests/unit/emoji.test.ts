import { describe, expect, it } from "vitest";
import { EMOJI_GROUPS, RECENT_MAX, insertAt, isEmojiOnly, parseRecent, pushRecent, searchEmoji } from "@/lib/emoji";

describe("emoji set", () => {
  it("has no duplicates and every entry has a name", () => {
    const all = EMOJI_GROUPS.flatMap((g) => g.items);
    expect(new Set(all.map((e) => e.char)).size).toBe(all.length);
    // Names are what screen readers announce, so no two are alike.
    expect(new Set(all.map((e) => e.name)).size).toBe(all.length);
    for (const e of all) {
      expect(e.char.trim()).toBe(e.char);
      expect(e.name).toMatch(/^[a-z0-9 ]+$/);
      expect(isEmojiOnly(e.char)).toBe(true);
    }
  });
});

describe("searchEmoji", () => {
  it("matches keyword prefixes, all words required", () => {
    expect(searchEmoji("fire").map((e) => e.char)).toContain("🔥");
    expect(searchEmoji("thu").map((e) => e.char)).toEqual(["👍", "👎"]);
    expect(searchEmoji("thumbs up").map((e) => e.char)).toEqual(["👍"]);
    expect(searchEmoji("LAUGH")[0]?.char).toBe("😄");
    expect(searchEmoji("   ")).toEqual([]);
    expect(searchEmoji("zzzqqq")).toEqual([]);
  });
});

describe("recent emoji", () => {
  it("puts the newest first, without duplicates, capped", () => {
    expect(pushRecent(["😀", "🔥"], "🔥")).toEqual(["🔥", "😀"]);
    const many = EMOJI_GROUPS.flatMap((g) => g.items.map((e) => e.char)).slice(0, 40);
    expect(many.reduce<string[]>((r, c) => pushRecent(r, c), [])).toHaveLength(RECENT_MAX);
  });
  it("ignores anything that isn't a known emoji", () => {
    expect(parseRecent('["🔥","<img>",3,"👍"]')).toEqual(["🔥", "👍"]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent(null)).toEqual([]);
  });
});

describe("insertAt", () => {
  it("inserts at the caret or replaces the selection", () => {
    expect(insertAt("hi there", 2, 2, "👋")).toEqual({ text: "hi👋 there", caret: 4 });
    expect(insertAt("hi there", 3, 8, "🔥")).toEqual({ text: "hi 🔥", caret: 5 });
    expect(insertAt("", 0, 0, "❤️")).toEqual({ text: "❤️", caret: 2 });
  });
  it("leaves the text alone if it would go over the limit", () => {
    expect(insertAt("abcd", 4, 4, "🔥", 5)).toEqual({ text: "abcd", caret: 4 });
  });
});

describe("isEmojiOnly", () => {
  it("is true for one to three emoji", () => {
    for (const t of ["🔥", "😂😂", " 👍 🎉 ❤️ ", "❤️‍🔥", "🇵🇰", "👋🏽"]) expect(isEmojiOnly(t)).toBe(true);
  });
  it("is false for text, numbers or more than three", () => {
    for (const t of ["", "  ", "ok 👍", "1", "#", "😀😀😀😀", "a", "™"]) expect(isEmojiOnly(t)).toBe(false);
  });
});

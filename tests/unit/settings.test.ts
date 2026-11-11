import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SOUNDS, parseSettings, shouldRing } from "@/lib/settings";
import { soundRecipes } from "@/lib/sounds";

describe("parseSettings", () => {
  it("falls back to defaults for missing or broken data", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values and repairs invalid ones one by one", () => {
    const s = parseSettings(JSON.stringify({ sound: "chime", volume: 7, ringGroup: false, desktop: "yes" }));
    expect(s.sound).toBe("chime");
    expect(s.volume).toBe(DEFAULT_SETTINGS.volume);
    expect(s.ringGroup).toBe(false);
    expect(s.desktop).toBe(false);
  });
});

describe("shouldRing", () => {
  it("rings only for conversations you aren't watching, per kind", () => {
    const s = { ...DEFAULT_SETTINGS, ringGroup: false };
    expect(shouldRing(s, "direct", false)).toBe(true);
    expect(shouldRing(s, "direct", true)).toBe(false);
    expect(shouldRing(s, "group", false)).toBe(false);
    expect(shouldRing(s, "call", false)).toBe(true);
    expect(shouldRing({ ...s, sound: "none" }, "direct", false)).toBe(false);
    expect(shouldRing({ ...s, volume: 0 }, "direct", false)).toBe(false);
  });
});

describe("sounds", () => {
  it("has a recipe for every sound except none, all short", () => {
    const recipes = soundRecipes();
    for (const { id } of SOUNDS) {
      if (id === "none") continue;
      const notes = recipes[id];
      expect(notes.length, id).toBeGreaterThan(0);
      expect(Math.max(...notes.map((n) => n.at + n.dur)), id).toBeLessThan(0.6);
    }
  });
});

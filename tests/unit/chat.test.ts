import { describe, expect, it } from "vitest";
import { MAX_TEXT, decodePacket, encodePacket, prepareText } from "@/lib/chat/protocol";
import {
  GROUP,
  chatReducer,
  dmKey,
  dmList,
  emptyState,
  forStorage,
  lastIncomingId,
  totalUnread,
  type ChatMessage,
  type ChatState,
} from "@/lib/chat/state";
import { deviceIdentity } from "@/lib/device";

const msg = (id: string, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  from: "u_sara",
  name: "Sara",
  color: "mint",
  text: `hello ${id}`,
  at: Number(id.replace(/\D/g, "")) || 1,
  mine: false,
  ...over,
});

describe("packets", () => {
  it("round-trips every packet type", () => {
    for (const p of [
      { t: "msg", id: "abcdef12", text: "hi there" },
      { t: "msg", id: "abcdef12", text: "just you", to: "u_kim" },
      { t: "seen", upTo: "abcdef12" },
      { t: "typing" },
      { t: "typing", to: "u_kim" },
    ] as const) {
      expect(decodePacket(encodePacket(p))).toEqual(p);
    }
  });

  it("drops anything malformed, unknown or oversized", () => {
    const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
    expect(decodePacket(new TextEncoder().encode("not json"))).toBeNull();
    expect(decodePacket(enc({ t: "msg", id: "x", text: "short id" }))).toBeNull();
    expect(decodePacket(enc({ t: "msg", id: "abcdef12", text: "" }))).toBeNull();
    expect(decodePacket(enc({ t: "msg", id: "abcdef12", text: "x".repeat(MAX_TEXT + 1) }))).toBeNull();
    expect(decodePacket(enc({ t: "delete-everything" }))).toBeNull();
    expect(decodePacket(new Uint8Array(10_000))).toBeNull();
  });
});

describe("prepareText", () => {
  it("trims, normalises line breaks and limits blank lines", () => {
    expect(prepareText("  hi\r\nthere  ")).toEqual({ text: "hi\nthere" });
    expect(prepareText("a\n\n\n\n\n\nb")).toEqual({ text: "a\n\n\nb" });
  });

  it("explains empty and long messages", () => {
    expect(prepareText("   ")).toEqual({ error: "Type a message first." });
    expect(prepareText("x".repeat(MAX_TEXT + 1))).toEqual({ error: "Keep messages under 1,000 characters." });
  });
});

describe("chatReducer", () => {
  const sara = { identity: "u_sara", name: "Sara", color: "mint" };

  it("counts unread for conversations you aren't looking at", () => {
    let s = emptyState();
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m1"), focused: true });
    expect(s.convos[GROUP]?.unread).toBe(0);
    s = chatReducer(s, { type: "message", key: dmKey("u_sara"), message: msg("m2"), peer: sara, focused: true });
    expect(s.convos[dmKey("u_sara")]?.unread).toBe(1);
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m3"), focused: false });
    expect(s.convos[GROUP]?.unread).toBe(1);
    expect(totalUnread(s)).toBe(2);
    s = chatReducer(s, { type: "open", key: dmKey("u_sara") });
    expect(s.active).toBe(dmKey("u_sara"));
    expect(s.convos[dmKey("u_sara")]?.unread).toBe(0);
    s = chatReducer(s, { type: "read", key: GROUP });
    expect(totalUnread(s)).toBe(0);
  });

  it("ignores duplicates and never counts your own or system messages", () => {
    let s = emptyState();
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m1"), focused: false });
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m1"), focused: false });
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m2", { mine: true }), focused: false });
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m3", { system: true }), focused: false });
    expect(s.convos[GROUP]?.messages).toHaveLength(3);
    expect(s.convos[GROUP]?.unread).toBe(1);
  });

  it("marks your direct messages seen up to the receipt", () => {
    const key = dmKey("u_sara");
    let s = emptyState();
    for (const id of ["m1", "m2", "m3"]) {
      s = chatReducer(s, { type: "message", key, peer: sara, focused: true, message: msg(id, { mine: true, seen: false, from: "me" }) });
    }
    s = chatReducer(s, { type: "seen", key, upTo: "m2" });
    expect(s.convos[key]?.messages.map((m) => m.seen)).toEqual([true, true, false]);
    // Unknown ids change nothing.
    expect(chatReducer(s, { type: "seen", key, upTo: "nope" })).toBe(s);
  });

  it("keeps the newest 300 messages", () => {
    let s = emptyState();
    for (let i = 1; i <= 310; i++) s = chatReducer(s, { type: "message", key: GROUP, message: msg(`m${i}`), focused: true });
    expect(s.convos[GROUP]?.messages).toHaveLength(300);
    expect(s.convos[GROUP]?.messages[0]?.id).toBe("m11");
  });

  it("lists direct chats newest first and finds the last incoming message", () => {
    let s: ChatState = emptyState();
    s = chatReducer(s, { type: "message", key: dmKey("a"), peer: { ...sara, identity: "a" }, focused: true, message: msg("m5") });
    s = chatReducer(s, { type: "message", key: dmKey("b"), peer: { ...sara, identity: "b" }, focused: true, message: msg("m9") });
    s = chatReducer(s, { type: "message", key: dmKey("b"), focused: true, message: msg("m10", { mine: true }) });
    expect(dmList(s).map((c) => c.key)).toEqual([dmKey("b"), dmKey("a")]);
    expect(lastIncomingId(s.convos[dmKey("b")])).toBe("m9");
  });

  it("stores only direct messages, newest 100", () => {
    let s = emptyState();
    s = chatReducer(s, { type: "message", key: GROUP, message: msg("m1"), focused: true });
    for (let i = 1; i <= 120; i++) {
      s = chatReducer(s, { type: "message", key: dmKey("u_sara"), peer: sara, focused: true, message: msg(`d${i}`) });
    }
    const saved = forStorage(s);
    expect(saved.convos[GROUP]?.messages).toEqual([]);
    expect(saved.convos[dmKey("u_sara")]?.messages).toHaveLength(100);
    expect(chatReducer(s, { type: "clear" })).toEqual(emptyState());
  });
});

describe("deviceIdentity", () => {
  it("is stable, secret-dependent and doesn't reveal the key", () => {
    const key = "k".repeat(43);
    const a = deviceIdentity(key, "secret-1");
    expect(a).toBe(deviceIdentity(key, "secret-1"));
    expect(a).not.toBe(deviceIdentity(key, "secret-2"));
    expect(a).not.toBe(deviceIdentity("j".repeat(43), "secret-1"));
    expect(a).toMatch(/^u_[A-Za-z0-9_-]{22}$/);
    expect(a).not.toContain(key.slice(0, 10));
  });
});

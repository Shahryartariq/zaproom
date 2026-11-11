/**
 * Conversation state for the text chat, as a pure reducer so it can be unit tested
 * and saved to the device.
 */

export const GROUP = "group";
export const dmKey = (identity: string) => `dm:${identity}`;
export const isDm = (key: string) => key.startsWith("dm:");
export const peerOf = (key: string) => key.slice(3);

const KEEP = 300;

export type Person = { identity: string; name: string; color: string };

export type ChatMessage = {
  id: string;
  from: string;
  name: string;
  color: string;
  text: string;
  at: number;
  mine: boolean;
  /** Direct messages you sent: has the other person seen it? */
  seen?: boolean;
  /** "Sara joined" lines in text rooms. */
  system?: boolean;
};

export type Conversation = {
  key: string;
  /** For direct messages, who it's with (kept when they go offline). */
  peer?: Person;
  messages: ChatMessage[];
  unread: number;
  lastAt: number;
};

export type ChatState = {
  convos: Record<string, Conversation>;
  active: string;
};

export type ChatAction =
  | { type: "message"; key: string; message: ChatMessage; peer?: Person; focused: boolean }
  | { type: "open"; key: string; peer?: Person }
  | { type: "seen"; key: string; upTo: string }
  | { type: "read"; key: string }
  | { type: "load"; state: ChatState }
  | { type: "clear" };

export function emptyState(): ChatState {
  return { convos: { [GROUP]: { key: GROUP, messages: [], unread: 0, lastAt: 0 } }, active: GROUP };
}

function convo(state: ChatState, key: string, peer?: Person): Conversation {
  const existing = state.convos[key];
  if (existing) return peer ? { ...existing, peer } : existing;
  return { key, peer, messages: [], unread: 0, lastAt: 0 };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "message": {
      const c = convo(state, action.key, action.peer);
      const m = action.message;
      if (c.messages.some((x) => x.id === m.id && x.from === m.from)) return state;
      const reading = (action.focused && state.active === action.key) || m.system;
      const next: Conversation = {
        ...c,
        messages: [...c.messages, m].slice(-KEEP),
        unread: m.mine || reading ? c.unread : c.unread + 1,
        lastAt: m.at,
      };
      return { ...state, convos: { ...state.convos, [action.key]: next } };
    }
    case "open": {
      const c = convo(state, action.key, action.peer);
      return { active: action.key, convos: { ...state.convos, [action.key]: { ...c, unread: 0 } } };
    }
    case "read": {
      const c = state.convos[action.key];
      if (!c || c.unread === 0) return state;
      return { ...state, convos: { ...state.convos, [action.key]: { ...c, unread: 0 } } };
    }
    case "seen": {
      const c = state.convos[action.key];
      if (!c) return state;
      const idx = c.messages.findIndex((m) => m.id === action.upTo && m.mine);
      if (idx < 0) return state;
      const messages = c.messages.map((m, i) => (m.mine && i <= idx && !m.seen ? { ...m, seen: true } : m));
      return { ...state, convos: { ...state.convos, [action.key]: { ...c, messages } } };
    }
    case "load":
      return action.state;
    case "clear":
      return emptyState();
  }
}

/** Direct-message conversations, most recent first. */
export function dmList(state: ChatState): Conversation[] {
  return Object.values(state.convos)
    .filter((c) => isDm(c.key) && c.messages.length > 0)
    .sort((a, b) => b.lastAt - a.lastAt);
}

export function totalUnread(state: ChatState): number {
  return Object.values(state.convos).reduce((n, c) => n + c.unread, 0);
}

/** The newest message from the other person, for "seen" receipts. */
export function lastIncomingId(c: Conversation | undefined): string | null {
  if (!c) return null;
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i];
    if (m && !m.mine) return m.id;
  }
  return null;
}

/** Only direct messages are kept on the device, and only the newest of each. */
export function forStorage(state: ChatState): ChatState {
  const convos: Record<string, Conversation> = {};
  for (const [key, c] of Object.entries(state.convos)) {
    if (isDm(key) && c.messages.length) convos[key] = { ...c, messages: c.messages.slice(-100) };
  }
  return { active: GROUP, convos: { ...emptyState().convos, ...convos } };
}

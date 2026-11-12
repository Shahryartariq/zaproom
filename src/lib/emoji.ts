/**
 * A hand-picked emoji set for the chat picker. Each entry is "emoji name keywords…";
 * the name is the first word (underscores become spaces) and is what screen readers
 * announce. Search matches the name and keywords, so no large emoji database ships.
 */
const RAW: Record<string, string[]> = {
  Smileys: [
    "😀 grin happy smile",
    "😃 smile happy joy",
    "😄 big_smile laugh happy",
    "😁 beam grin teeth",
    "😆 laugh squint lol",
    "😅 sweat_smile relief phew",
    "🤣 rofl rolling laugh lol",
    "😂 joy tears laugh lol",
    "🙂 slight smile ok",
    "🙃 upside down silly",
    "😉 wink",
    "😊 blush smile happy",
    "😇 angel innocent halo",
    "🥰 smiling_hearts love adore",
    "😍 heart_eyes love",
    "🤩 star_struck wow",
    "😘 blow_kiss love",
    "😋 yum tasty delicious",
    "😛 tongue playful",
    "😜 crazy_wink tongue",
    "🤪 zany crazy goofy",
    "🤑 money_face rich",
    "🤗 hug hugs",
    "🤭 oops giggle",
    "🤫 shush quiet secret",
    "🤔 think thinking hmm",
    "🤐 zip quiet",
    "😐 neutral meh",
    "😑 expressionless blank",
    "😶 speechless silent",
    "😏 smirk",
    "😒 unamused meh",
    "🙄 eye roll whatever",
    "😬 grimace awkward yikes",
    "😌 relieved calm",
    "😔 pensive sad",
    "😪 sleepy",
    "😴 sleep zzz tired",
    "😷 mask sick",
    "🤒 sick fever ill",
    "🤯 mind blown wow",
    "🥳 party_face celebrate birthday",
    "😎 cool sunglasses",
    "🤓 nerd geek",
    "🧐 monocle curious",
    "😕 confused",
    "😟 worried",
    "😮 surprised wow oh",
    "😲 astonished shocked",
    "🥺 pleading puppy please",
    "😢 cry sad tear",
    "😭 sob crying sad",
    "😱 scream scared shock",
    "😩 weary tired ugh",
    "😤 triumph huff",
    "😡 angry mad rage",
    "🤬 swear cursing angry",
    "😈 devil mischief",
    "💀 skull dead lol",
    "🤡 clown",
    "👻 ghost boo",
    "👽 alien",
    "🤖 robot bot ai",
    "💩 poop",
  ],
  Gestures: [
    "👋 wave hello hi bye",
    "🤚 raised back hand",
    "✋ hand stop high five",
    "👌 ok_hand perfect",
    "🤌 pinched fingers italian",
    "✌️ peace victory",
    "🤞 fingers crossed luck",
    "🤟 love_you sign",
    "🤘 rock horns metal",
    "🤙 call me shaka",
    "👈 point_left",
    "👉 point_right",
    "👆 point_up",
    "👇 point_down",
    "☝️ index up one",
    "👍 thumbs_up yes like good",
    "👎 thumbs_down no dislike bad",
    "✊ fist",
    "👊 punch fist bump",
    "👏 clap applause bravo",
    "🙌 raise hands hooray",
    "👐 open hands",
    "🤲 palms up",
    "🤝 handshake deal",
    "🙏 pray please thanks",
    "💪 muscle strong flex",
    "🧠 brain smart",
    "👀 eyes look see",
    "🫡 salute",
    "🫶 heart_hands love",
    "🙈 see no evil monkey",
    "🙉 hear no evil monkey",
    "🙊 speak no evil monkey",
  ],
  Hearts: [
    "❤️ red_heart love",
    "🧡 orange heart",
    "💛 yellow heart",
    "💚 green heart",
    "💙 blue heart",
    "💜 purple heart",
    "🖤 black heart",
    "🤍 white heart",
    "🤎 brown heart",
    "💔 broken heart",
    "❤️‍🔥 heart_on_fire love",
    "💕 two hearts love",
    "💞 revolving hearts",
    "💓 beating heart",
    "💗 growing heart",
    "💖 sparkling heart",
    "💘 cupid arrow heart",
    "💝 heart_gift ribbon",
    "💋 kiss lips",
    "💯 hundred 100 perfect",
    "💢 anger",
    "💥 boom collision",
    "💫 dizzy star",
    "💦 sweat drops",
    "💨 dash fast",
    "💬 speech bubble chat",
    "💭 thought bubble",
    "💤 zzz sleep",
  ],
  Nature: [
    "🐶 dog puppy",
    "🐱 cat kitty",
    "🐭 mouse",
    "🐰 rabbit bunny",
    "🦊 fox",
    "🐻 bear",
    "🐼 panda",
    "🐨 koala",
    "🐯 tiger",
    "🦁 lion",
    "🐮 cow",
    "🐷 pig",
    "🐸 frog",
    "🐵 monkey",
    "🐔 chicken",
    "🐧 penguin",
    "🐦 bird",
    "🦄 unicorn",
    "🐝 bee",
    "🦋 butterfly",
    "🐢 turtle slow",
    "🐍 snake",
    "🐙 octopus",
    "🐬 dolphin",
    "🐳 whale",
    "🌸 cherry blossom flower",
    "🌹 rose flower",
    "🌻 sunflower",
    "🌵 cactus",
    "🌴 palm tree",
    "🍀 clover luck",
    "🍁 maple leaf autumn",
    "🌈 rainbow",
    "☀️ sun sunny",
    "🌙 moon night",
    "⭐ star",
    "🌟 glowing star",
    "⚡ lightning zap",
    "🔥 fire lit hot",
    "❄️ snow cold",
    "🌊 ocean_wave sea",
    "☔ rain umbrella",
  ],
  Food: [
    "🍎 apple",
    "🍌 banana",
    "🍉 watermelon",
    "🍓 strawberry",
    "🍒 cherries",
    "🍑 peach",
    "🥭 mango",
    "🍍 pineapple",
    "🥑 avocado",
    "🌶️ chili hot spicy",
    "🌽 corn",
    "🍞 bread",
    "🧀 cheese",
    "🍳 egg cooking",
    "🍔 burger",
    "🍟 fries",
    "🍕 pizza",
    "🌭 hot dog",
    "🌮 taco",
    "🥙 wrap shawarma",
    "🍝 pasta spaghetti",
    "🍜 noodles ramen",
    "🍛 curry rice biryani",
    "🍣 sushi",
    "🍦 ice cream",
    "🍩 donut",
    "🍪 cookie",
    "🎂 birthday cake",
    "🍰 cake slice",
    "🍫 chocolate",
    "🍿 popcorn movie",
    "☕ coffee tea",
    "🍵 tea chai",
    "🧋 bubble tea boba",
    "🥤 drink soda",
    "🧃 juice box",
  ],
  Activity: [
    "🎉 party tada celebrate",
    "🎊 confetti",
    "🎈 balloon",
    "🎁 gift present",
    "🏆 trophy win",
    "🥇 gold medal first",
    "⚽ football soccer",
    "🏀 basketball",
    "🏏 cricket",
    "🎾 tennis",
    "🏸 badminton",
    "🎮 game controller gaming",
    "🎯 target bullseye",
    "🎲 dice",
    "♟️ chess",
    "🎵 music_note",
    "🎶 music_notes",
    "🎧 headphones",
    "🎤 mic karaoke sing",
    "🎸 guitar",
    "🎬 movie film",
    "📸 camera photo",
    "✈️ plane travel flight",
    "🚗 car drive",
    "🚀 rocket launch ship",
    "🏠 home house",
    "🏖️ beach holiday",
    "⛰️ mountain",
  ],
  Objects: [
    "💻 laptop computer code",
    "⌨️ keyboard",
    "📱 phone mobile",
    "🔋 battery",
    "💡 idea bulb",
    "📌 pin",
    "📎 paperclip",
    "📝 memo note write",
    "📚 books study",
    "✏️ pencil",
    "📅 calendar date",
    "⏰ alarm clock time",
    "⌛ hourglass wait",
    "🔒 lock private",
    "🔑 key",
    "🛠️ tools fix",
    "⚙️ gear settings",
    "🧪 test experiment",
    "🐛 bug",
    "📦 package ship box",
    "💰 money_bag",
    "💸 money_flying spend",
    "🪙 coin crypto",
    "📈 chart_up growth",
    "📉 chart_down",
    "🔔 bell notification",
    "📣 announce megaphone",
    "✅ check done yes",
    "❌ cross no wrong",
    "⚠️ warning",
    "❓ question",
    "❗ exclamation",
    "➕ plus add",
    "🆗 ok",
    "🆕 new",
    "🔗 link",
    "✨ sparkles magic new",
    "🇵🇰 pakistan flag",
  ],
};

export type Emoji = { char: string; name: string; words: string };
export type EmojiGroup = { name: string; icon: string; items: Emoji[] };

export const EMOJI_GROUPS: EmojiGroup[] = Object.entries(RAW).map(([name, list]) => {
  const items = list.map((line) => {
    const [char = "", first = "", ...rest] = line.split(" ");
    const name = first.replaceAll("_", " ");
    return { char, name, words: [name, ...rest].join(" ") };
  });
  return { name, icon: items[0]?.char ?? "", items };
});

const ALL: Emoji[] = EMOJI_GROUPS.flatMap((g) => g.items);
const KNOWN = new Set(ALL.map((e) => e.char));

/**
 * Emoji whose name or keywords start with every word of the query. Exact names come
 * first ("fire" → 🔥 before ❤️‍🔥), then names that start with the query, then the rest.
 */
export function searchEmoji(query: string, limit = 64): Emoji[] {
  const q = query.toLowerCase().trim().replace(/\s+/g, " ");
  const terms = q.split(" ").filter(Boolean);
  if (!terms.length) return [];
  const rank = (e: Emoji) => (e.name === q ? 0 : e.name.startsWith(q) ? 1 : 2);
  return ALL.filter((e) => {
    const words = e.words.split(" ");
    return terms.every((t) => words.some((w) => w.startsWith(t)));
  })
    .map((e, i) => ({ e, i, r: rank(e) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map(({ e }) => e);
}

export const RECENT_KEY = "zaproom:emoji-recent";
export const RECENT_MAX = 24;

/** The recent list after using `char`: most recent first, no duplicates, only known emoji. */
export function pushRecent(recent: readonly string[], char: string): string[] {
  return [char, ...recent.filter((c) => c !== char)].filter((c) => KNOWN.has(c)).slice(0, RECENT_MAX);
}

export function parseRecent(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((c): c is string => typeof c === "string" && KNOWN.has(c)).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Insert `emoji` over the current selection; returns the new text and caret position. */
export function insertAt(text: string, start: number, end: number, emoji: string, max = Infinity) {
  const next = text.slice(0, start) + emoji + text.slice(end);
  if (next.length > max) return { text, caret: end };
  return { text: next, caret: start + emoji.length };
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
// Emoji that show as pictures by default, or text symbols forced into emoji style (U+FE0F), or flags.
const PICTO = /\p{Emoji_Presentation}|\uFE0F|\p{Regional_Indicator}/u;

/** True for messages made of 1–3 emoji (whitespace ignored), shown large like other chat apps do. */
export function isEmojiOnly(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact || compact.length > 40 || !segmenter) return false;
  let count = 0;
  for (const { segment } of segmenter.segment(compact)) {
    if (!PICTO.test(segment)) return false;
    if (++count > 3) return false;
  }
  return count > 0;
}

import { z } from "zod";

/** Avatar colours. All are light enough for dark initials, on both themes. */
export const AVATAR_COLORS = [
  { id: "tangerine", hex: "#FF8A3D", label: "Tangerine" },
  { id: "mint", hex: "#3DDC97", label: "Mint" },
  { id: "sky", hex: "#4CB8FF", label: "Sky" },
  { id: "lilac", hex: "#B18CFF", label: "Lilac" },
  { id: "rose", hex: "#FF7AAE", label: "Rose" },
  { id: "lemon", hex: "#F5D547", label: "Lemon" },
  { id: "coral", hex: "#FF6B5E", label: "Coral" },
  { id: "teal", hex: "#2EC4B6", label: "Teal" },
] as const;

export type AvatarColorId = (typeof AVATAR_COLORS)[number]["id"];

const COLOR_IDS = AVATAR_COLORS.map((c) => c.id) as [AvatarColorId, ...AvatarColorId[]];

export function colorHex(id: string | undefined): string {
  return AVATAR_COLORS.find((c) => c.id === id)?.hex ?? AVATAR_COLORS[0].hex;
}

/** Letters (any script), numbers, combining marks, spaces and a little punctuation. */
const NAME_CHARS = /^[\p{L}\p{M}\p{N} ._'-]+$/u;
const TITLE_CHARS = /^[\p{L}\p{M}\p{N} ._'&!?#:,()+-]+$/u;

/** Trims and collapses runs of whitespace. Control characters become spaces first. */
export function tidy(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
}

export const nameSchema = z
  .string()
  .transform(tidy)
  .pipe(
    z
      .string()
      .min(1, "Enter a name so people know who you are.")
      .max(24, "Keep your name to 24 characters.")
      .regex(NAME_CHARS, "Use letters, numbers, spaces, dots, dashes or apostrophes."),
  );

export const colorSchema = z.enum(COLOR_IDS);

export const profileSchema = z.object({ name: nameSchema, color: colorSchema });
export type Profile = z.infer<typeof profileSchema>;

export const roomTitleSchema = z
  .string()
  .transform(tidy)
  .pipe(
    z
      .string()
      .min(2, "Give the room a name of at least 2 characters.")
      .max(40, "Keep the room name to 40 characters.")
      .regex(TITLE_CHARS, "Room names can use letters, numbers, spaces and simple punctuation."),
  );

export const roomTopicSchema = z
  .string()
  .transform(tidy)
  .pipe(z.string().max(80, "Keep the topic to 80 characters."));

export const createRoomSchema = z.object({
  title: roomTitleSchema,
  topic: roomTopicSchema.optional().default(""),
  visibility: z.enum(["public", "private"]),
  kind: z.enum(["video", "voice", "text"]),
});
export type CreateRoomInput = z.input<typeof createRoomSchema>;

/** Up to two initials, from the first and last words. */
export function initials(name: string): string {
  const words = tidy(name).split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? "")[0] ?? "") : "";
  return (first + last).toUpperCase();
}

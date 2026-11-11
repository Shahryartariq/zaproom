import { initials } from "@/lib/profile";

type Props = {
  name: string;
  color: string | undefined;
  size?: "xs" | "s" | "m" | "l" | "xl";
  speaking?: boolean;
  /** Decorative when a visible name sits next to it. */
  decorative?: boolean;
};

export function Avatar({ name, color, size = "m", speaking, decorative = true }: Props) {
  const cls = ["avatar", `c-${color ?? "lilac"}`, size !== "m" && size, speaking && "speaking"].filter(Boolean).join(" ");
  return (
    <span className={cls} aria-hidden={decorative || undefined} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : name}>
      {size === "xs" ? Array.from(initials(name))[0] : initials(name)}
    </span>
  );
}

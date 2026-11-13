import { adminTimeZone } from "@/lib/admin.server";

/** "13 Nov, 8:32 PM" in the admin's time zone. */
export function when(date: Date | number | null | undefined): string {
  if (date === null || date === undefined) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: adminTimeZone(),
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function ago(date: Date | number | null | undefined, now = Date.now()): string {
  if (date === null || date === undefined) return "—";
  const s = Math.round((now - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const num = (n: number) => new Intl.NumberFormat("en").format(Math.round(n));

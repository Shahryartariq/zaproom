import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

// Update a date when that page's content changes.
const PAGES = [
  { path: "/", priority: 1, updated: "2026-11-13", changeFrequency: "daily" },
  { path: "/chat", priority: 0.9, updated: "2026-11-13", changeFrequency: "weekly" },
  { path: "/strangers", priority: 0.8, updated: "2026-11-13", changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.3, updated: "2026-11-11", changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.map((p) => ({
    url: `${base}${p.path === "/" ? "" : p.path}`,
    lastModified: p.updated,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}

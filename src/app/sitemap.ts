import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

const PAGES = [
  { path: "/", priority: 1, updated: "2026-11-11" },
  { path: "/strangers", priority: 0.8, updated: "2026-11-11" },
  { path: "/privacy", priority: 0.3, updated: "2026-11-11" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.map((p) => ({ url: `${base}${p.path === "/" ? "" : p.path}`, lastModified: p.updated, priority: p.priority }));
}

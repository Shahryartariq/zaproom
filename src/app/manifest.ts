import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zaproom",
    short_name: "Zaproom",
    description: "Free video, voice and text chat rooms in your browser. No sign-up.",
    id: "/",
    scope: "/",
    lang: "en",
    categories: ["social", "communication"],
    start_url: "/",
    display: "standalone",
    background_color: "#16122E",
    theme_color: "#16122E",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

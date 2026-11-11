import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zaproom",
    short_name: "Zaproom",
    description: "Video, voice and chat rooms in your browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#16122E",
    theme_color: "#16122E",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

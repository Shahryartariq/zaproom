import type { Metadata } from "next";

export const SITE_NAME = "Zaproom";
export const HOME_TITLE = "Zaproom: free video, voice and text chat rooms";
export const HOME_DESCRIPTION =
  "Free video, voice and text chat rooms in your browser. Start a room, join one that's live, chat with everyone online or meet a stranger. No sign-up.";

/** The social card image (src/app/opengraph-image.tsx). Pages that set their own card must list it again. */
export const SOCIAL_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Zaproom: rooms with the lights on" };

/** Open Graph and Twitter card fields for a page. */
export function socialCard(path: string, title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: path, images: [SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SOCIAL_IMAGE.url] },
  };
}

/**
 * Metadata for one page. Social cards get the page's own title, description and URL;
 * without this every page would share the home page's card.
 */
export function pageMeta({ path, title, description, social }: { path: string; title: string; description: string; social?: string }): Metadata {
  const card = social ?? `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialCard(path, card, description),
  };
}

/** schema.org data for the home page: what Zaproom is and who made it. */
export function structuredData(base: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: SITE_NAME,
        description: HOME_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${base}/#app`,
        name: SITE_NAME,
        url: base,
        description: HOME_DESCRIPTION,
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Any",
        browserRequirements: "A modern browser with WebRTC",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        image: `${base}/opengraph-image`,
        featureList: [
          "Video and voice rooms for up to 12 people",
          "Screen sharing",
          "Global text chat and private messages",
          "Text-only rooms",
          "Random one-to-one chat with strangers",
          "No sign-up",
        ],
        author: { "@type": "Person", name: "Muhammad Shehryar", url: "https://github.com/Shahryartariq" },
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json">, safe to put inside HTML. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

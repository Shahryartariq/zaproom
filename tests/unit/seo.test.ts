import { describe, expect, it } from "vitest";
import { HOME_DESCRIPTION, HOME_TITLE, jsonLd, pageMeta, structuredData } from "@/lib/seo";

describe("pageMeta", () => {
  it("gives each page its own canonical and social card", () => {
    const m = pageMeta({ path: "/chat", title: "Chat", description: "Talk to people." });
    expect(m.alternates?.canonical).toBe("/chat");
    expect(m.openGraph).toMatchObject({ url: "/chat", title: "Chat | Zaproom", description: "Talk to people." });
    expect(m.twitter).toMatchObject({ title: "Chat | Zaproom", description: "Talk to people." });
    // Setting a card drops the shared image unless it's listed again.
    expect(m.openGraph?.images).toEqual([expect.objectContaining({ url: "/opengraph-image", width: 1200 })]);
  });
});

describe("home copy", () => {
  it("fits in search results", () => {
    expect(HOME_TITLE.length).toBeLessThanOrEqual(60);
    expect(HOME_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});

describe("structured data", () => {
  it("describes a free web app and is safe inside a script tag", () => {
    const data = structuredData("https://example.com");
    const app = data["@graph"].find((n) => n["@type"] === "WebApplication");
    expect(app).toMatchObject({ url: "https://example.com", offers: { price: "0" } });
    expect(jsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
    expect(JSON.parse(jsonLd({ a: "<b>" }))).toEqual({ a: "<b>" });
  });
});

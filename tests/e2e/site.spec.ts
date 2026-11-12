import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ROOM_ID, mockApi, watchErrors } from "./fixtures";

test.describe("lobby", () => {
  test("lists live rooms and counts people", async ({ page }) => {
    const errors = watchErrors(page);
    await mockApi(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rooms with the lights on.");
    await expect(page.getByText("people in rooms now")).toContainText("9");
    await expect(page.getByText("waiting to meet someone")).toContainText("2");
    const rows = page.locator(".room-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("3 inside");
    await expect(rows.nth(1)).toContainText("Empty");
    await rows.first().getByRole("link").click();
    await expect(page).toHaveURL(`/r/${ROOM_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Next.js help desk");
    expect(errors).toEqual([]);
  });

  test("says when calls aren't configured", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status").filter({ hasText: "Calls are switched off" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start room" })).toBeDisabled();
    await expect(page.getByText("No open rooms right now.")).toBeVisible();
  });

  test("checks the form before creating a room", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    const form = page.locator("form.start-form");
    await form.getByRole("button", { name: "Start room" }).click();
    await expect(form.getByRole("alert")).toHaveText("Enter a name so people know who you are.");

    await form.getByLabel("Your name").fill("Sherry");
    await form.getByRole("button", { name: "Start room" }).click();
    await expect(form.getByRole("alert")).toHaveText("Give the room a name of at least 2 characters.");

    await form.getByLabel("Room name").fill("Friday standup");
    await form.getByText("Link only").click();
    await form.getByText("Voice", { exact: true }).click();
    const request = page.waitForRequest((r) => r.url().endsWith("/api/rooms") && r.method() === "POST");
    await form.getByRole("button", { name: "Start room" }).click();
    expect((await request).postDataJSON()).toEqual({ title: "Friday standup", topic: "", visibility: "private", kind: "voice" });
    await expect(page).toHaveURL(`/r/${ROOM_ID}?new=1`);
  });

  test("remembers your name and colour", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    const form = page.locator("form.start-form");
    await form.getByLabel("Your name").fill("  Sherry   T ");
    await form.locator("label[for$='-sky']").click();
    await form.getByLabel("Room name").fill("Standup");
    await form.getByRole("button", { name: "Start room" }).click();
    await expect(page).toHaveURL(/\/r\//);
    await expect(page.getByLabel("Your name")).toHaveValue("Sherry T");
    await expect(page.locator(".prejoin .you .avatar")).toHaveClass(/c-sky/);
    await expect(page.locator(".prejoin .you .avatar")).toHaveText("ST");
  });
});

test.describe("pre-join", () => {
  test("shows a camera preview with mic and camera switches", async ({ page }) => {
    const errors = watchErrors(page);
    await mockApi(page);
    await page.goto(`/r/${ROOM_ID}`);
    await expect(page.getByText("3 people inside")).toBeVisible();
    await expect(page.locator(".preview video")).toBeVisible();
    await page.getByRole("button", { name: "Turn camera off" }).click();
    await expect(page.locator(".preview video")).toHaveCount(0);
    await expect(page.locator(".preview .avatar")).toBeVisible();
    await page.getByRole("button", { name: "Turn microphone off" }).click();
    await expect(page.getByRole("button", { name: "Turn microphone on" })).toHaveAttribute("aria-pressed", "false");
    expect(errors).toEqual([]);
  });

  test("explains a closed or unknown room", async ({ page }) => {
    await page.route("**/api/rooms/abc-defg-hjk", (r) => r.fulfill({ status: 404, json: { error: "This room doesn't exist or has closed." } }));
    await page.goto("/r/abc-defg-hjk");
    await expect(page.getByRole("heading", { name: "Room not available" })).toBeVisible();
    await expect(page.getByText("This room doesn't exist or has closed.")).toBeVisible();
  });

  test("404s malformed room links", async ({ page }) => {
    const res = await page.goto("/r/not-a-room");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  });
});

test.describe("strangers", () => {
  test("needs a name before matching", async ({ page }) => {
    await page.goto("/strangers");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meet a stranger");
    await page.getByRole("button", { name: "Start matching" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Enter a name so people know who you are.");
  });

  test("shows the server's error when calls are off", async ({ page }) => {
    await page.goto("/strangers");
    await page.getByLabel("Your name").fill("Sherry");
    await page.getByRole("button", { name: "Start matching" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Calls aren't switched on");
  });
});

test.describe("theme", () => {
  test("defaults to dark and remembers a choice without a flash", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator(".theme-switch label[title='Light']").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    // The head script must apply the saved theme before any app code runs.
    await page.route("**/_next/static/**/*.js", (r) => r.abort());
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("can follow the device", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator(".theme-switch label[title='Match device']").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const path of ["/", "/strangers", "/chat", "/privacy", `/r/${ROOM_ID}`]) {
      test(`${path} has no axe violations in ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("zaproom:theme", t), theme);
        await mockApi(page);
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
      });
    }
  }

  test("pages don't scroll sideways", async ({ page }) => {
    await mockApi(page);
    for (const path of ["/", "/strangers", "/chat", "/privacy", `/r/${ROOM_ID}`]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("security and SEO", () => {
  test("sends a nonce-based CSP and security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("wss://*.livekit.cloud");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"]).toContain("camera=(self)");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("keeps rooms out of search engines", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    // Room pages must stay crawlable, or search engines never see their noindex.
    expect(robots).not.toContain("Disallow: /r/");
    expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/chat", "/strangers", "/privacy"]) expect(sitemap).toContain(`${path}</loc>`);
    expect(sitemap).not.toContain("/r/");
  });

  test("room pages are noindex and don't leak the room name in the title", async ({ page }) => {
    await mockApi(page);
    const res = await page.goto(`/r/${ROOM_ID}`);
    const html = (await res?.text()) ?? "";
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain("<title>Join a room | Zaproom</title>");
    // Link-only rooms get a generic invite card that never names the room.
    expect(html).toContain(`<meta property="og:title" content="You&#x27;re invited to a room on Zaproom"`);
    expect(html).toContain('<meta property="og:image"');
  });

  test("has Open Graph tags and an image", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /^Zaproom: free video, voice and text chat rooms$/);
    const img = await request.get("/opengraph-image");
    expect(img.headers()["content-type"]).toBe("image/png");
  });

  test("every page has its own title, description, canonical and social card", async ({ request }) => {
    const seen = new Set<string>();
    for (const path of ["/", "/chat", "/strangers", "/privacy"]) {
      const html = await (await request.get(path)).text();
      const meta = (attr: string, key: string) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const description = meta("name", "description") ?? "";
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
      expect(title.length, path).toBeGreaterThan(10);
      expect(title.length, path).toBeLessThanOrEqual(65);
      expect(description.length, path).toBeGreaterThan(50);
      expect(description.length, path).toBeLessThanOrEqual(160);
      expect(new URL(canonical).pathname.replace(/\/$/, "") || "/", path).toBe(path);
      // The social card points at this page, not the home page.
      expect(meta("property", "og:url"), path).toBe(canonical);
      expect(meta("property", "og:description"), path).toBe(description);
      expect(meta("property", "og:image"), path).toBeTruthy();
      expect(meta("name", "twitter:card"), path).toBe("summary_large_image");
      expect(html.match(/<h1[\s>]/g)?.length ?? 0, path).toBeLessThanOrEqual(1);
      expect(seen.has(title), `${path} repeats a title`).toBe(false);
      seen.add(title);
    }
  });

  test("the home page describes the app as structured data", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw ?? "{}") as { "@graph": { "@type": string; name: string; offers?: { price: string } }[] };
    const app = data["@graph"].find((n) => n["@type"] === "WebApplication");
    expect(app?.name).toBe("Zaproom");
    expect(app?.offers?.price).toBe("0");
    expect(data["@graph"].some((n) => n["@type"] === "WebSite")).toBe(true);
  });

  test("installs with PNG and maskable icons, and an Apple touch icon", async ({ request }) => {
    const manifest = (await (await request.get("/manifest.webmanifest")).json()) as { icons: { src: string; sizes: string; purpose?: string }[] };
    expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    const html = await (await request.get("/")).text();
    const apple = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)?.[1];
    expect(apple).toBeTruthy();
    expect((await request.get(apple ?? "")).headers()["content-type"]).toBe("image/png");
  });

  test("no Content-Security-Policy violations while pages load", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
      );
    });
    for (const path of ["/", "/chat", "/strangers", "/privacy"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp), path).toEqual([]);
    }
  });

  test("the call library loads only when someone joins", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (res) => {
      if (res.url().endsWith(".js")) scripts.push(await res.text().catch(() => ""));
    });
    for (const path of ["/", "/chat", "/strangers"]) await page.goto(path, { waitUntil: "networkidle" });
    // livekit-client registers this protocol string; none of the loaded code should contain it.
    expect(scripts.some((s) => s.includes("livekit.SignalRequest"))).toBe(false);
  });
});

test.describe("API guards", () => {
  test("refuses cross-site requests", async ({ request }) => {
    const res = await request.post("/api/token", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: { roomId: ROOM_ID, name: "x", color: "mint" },
    });
    expect(res.status()).toBe(403);
  });

  test("reports when LiveKit isn't configured", async ({ request }) => {
    for (const path of ["/api/token", "/api/rooms", "/api/strangers/queue", "/api/strangers/match", "/api/chat/token"]) {
      const res = await request.post(path, { data: {} });
      expect(res.status(), path).toBe(503);
    }
    const lobby = await (await request.get("/api/rooms")).json();
    expect(lobby).toEqual({ configured: false, rooms: [], online: 0, waiting: 0, chatting: 0 });
  });

  test("rejects malformed room ids before calling LiveKit", async ({ request }) => {
    expect((await request.get("/api/rooms/..%2F..%2Fadmin")).status()).toBe(404);
    expect((await request.get("/api/rooms/s-0123456789abcdef")).status()).toBe(404);
  });
});

test.describe("settings", () => {
  test("picks a sound, sets volume and switches, and remembers them", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await dialog.getByText("Marimba").click();
    await dialog.getByLabel(/^Volume/).fill("30");
    await dialog.getByRole("switch", { name: "Global chat and text rooms" }).uncheck();
    await dialog.getByRole("switch", { name: /Press Enter to send/ }).uncheck();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("zaproom:settings") ?? "{}"));
    expect(saved).toMatchObject({ sound: "marimba", volume: 0.3, ringGroup: false, enterToSend: false });

    await page.reload();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(dialog.getByRole("radio", { name: "Marimba" })).toBeChecked();
    await expect(dialog.getByRole("switch", { name: "Global chat and text rooms" })).not.toBeChecked();
    await expect(dialog.getByRole("switch", { name: "Private messages" })).toBeChecked();
  });

  test("plays the chosen sound through Web Audio", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __tones: number }).__tones = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args: Parameters<typeof start>) {
        (window as unknown as { __tones: number }).__tones++;
        return start.apply(this, args);
      };
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("dialog").getByText("Chime").click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __tones: number }).__tones)).toBe(2);
    await page.getByRole("dialog").getByText("No sound").click();
    await page.getByRole("dialog").getByRole("button", { name: "Test" }).isDisabled();
  });

  test("saves a new name", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("Sherry");
    await dialog.getByRole("button", { name: "Save name" }).click();
    await expect(dialog.getByText(/^Saved\./)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("form.start-form").getByLabel("Your name")).toHaveValue("Sherry");
  });
});

test.describe("chat page", () => {
  test("asks for a name, then explains when chat is off", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chat");
    await page.getByRole("button", { name: "Open chat" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Enter a name so people know who you are.");
    await page.getByLabel("Your name").fill("Sherry");
    await page.getByRole("button", { name: "Open chat" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Calls aren't switched on");
  });

  test("a first-time visitor joins once, not twice", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/chat/token", async (route) => {
      calls++;
      await route.fulfill({ status: 503, json: { error: "off" } });
    });
    await page.goto("/chat");
    await page.getByLabel("Your name").fill("Sherry");
    await page.getByRole("button", { name: "Open chat" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("off");
    await page.waitForTimeout(500);
    expect(calls).toBe(1);
  });

  test("sends a stable device key with the request", async ({ page }) => {
    const bodies: { device?: string }[] = [];
    await page.route("**/api/chat/token", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 503, json: { error: "off" } });
    });
    await page.addInitScript(() => localStorage.setItem("zaproom:profile", JSON.stringify({ name: "Sherry", color: "mint" })));
    await page.goto("/chat");
    await expect.poll(() => bodies.length).toBe(1);
    await page.reload();
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[0]?.device).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(bodies[1]?.device).toBe(bodies[0]?.device);
  });

  test("a text room is offered in the lobby form", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    const form = page.locator("form.start-form");
    await form.getByLabel("Your name").fill("Sherry");
    await form.getByLabel("Room name").fill("Book club");
    await form.getByText("Text", { exact: true }).click();
    const request = page.waitForRequest((r) => r.url().endsWith("/api/rooms") && r.method() === "POST");
    await form.getByRole("button", { name: "Start room" }).click();
    expect((await request).postDataJSON()).toMatchObject({ kind: "text" });
  });

  test("joining a text room never asks for the camera or microphone", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __media: number }).__media = 0;
      const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (c) => {
        (window as unknown as { __media: number }).__media++;
        return gum(c);
      };
    });
    await page.route(`**/api/rooms/${ROOM_ID}`, (route) =>
      route.fulfill({ json: { id: ROOM_ID, title: "Book club", topic: "", kind: "text", visibility: "public", count: 2 } }),
    );
    await page.goto(`/r/${ROOM_ID}`);
    await expect(page.getByText("Text room")).toBeVisible();
    await expect(page.getByRole("button", { name: "Join chat" })).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __media: number }).__media)).toBe(0);
  });
});

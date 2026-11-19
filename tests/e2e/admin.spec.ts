import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "./admin-password";

// Needs a database: E2E_DATABASE_URL (set in CI and for local runs). Skipped otherwise.
test.skip(!process.env.E2E_DATABASE_URL, "No database for the visitor log");

const PASSWORD = E2E_ADMIN_PASSWORD;
let n = 0;
const fakeIp = () => `198.51.100.${(Date.now() + n++) % 250}`;

/** A browser context that looks like it comes from a given place (Vercel's location headers). */
async function visitor(browser: Browser, ip: string, city = "Sargodha") {
  return browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": ip,
      "x-vercel-ip-country": "PK",
      "x-vercel-ip-country-region": "PB",
      "x-vercel-ip-city": encodeURIComponent(city),
      "x-vercel-ip-latitude": "32.08",
      "x-vercel-ip-longitude": "72.67",
      "x-vercel-ip-timezone": "Asia/Karachi",
    },
  });
}

async function admin(browser: Browser) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": fakeIp() } });
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  return { context, page };
}

test("the admin panel needs the password", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.getByLabel("Password").fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn't right" })).toBeVisible();
  // The data routes refuse anyone without a session.
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  expect((await request.post("/api/admin/visitors", { form: { id: "x" } })).status()).toBe(401);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
});

test("visits show up with location, device, pages and time, and can be deleted", async ({ browser }) => {
  const ip = fakeIp();
  const ctx = await visitor(browser, ip, "Sārgodha");
  const page = await ctx.newPage();
  await page.goto("/?utm_source=e2e");
  await page.waitForResponse((r) => r.url().endsWith("/api/t") && r.status() === 200);
  await page.getByRole("link", { name: "Chat", exact: true }).first().click();
  await page.waitForResponse((r) => r.url().endsWith("/api/t") && r.status() === 200);
  await page.getByRole("link", { name: "Privacy" }).click();
  await page.waitForResponse((r) => r.url().endsWith("/api/t") && r.status() === 200);
  await ctx.close(); // sends the last "left the page" report

  const { context, page: a } = await admin(browser);
  await a.goto(`/admin/visitors?q=${ip}`);
  const row = a.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(ip);
  await expect(row).toContainText("Sārgodha, PK");
  await expect(row).toContainText("Chrome");
  await expect(row.locator("td.num").nth(1)).toHaveText("3");

  await row.getByRole("link").first().click();
  await expect(a.getByRole("heading", { level: 1 })).toHaveText("Visitor from Sārgodha");
  const timeline = a.locator(".admin-timeline");
  for (const path of ["/?utm_source=e2e", "/chat", "/privacy"]) await expect(timeline).toContainText(path);
  await expect(a.locator(".admin-facts")).toContainText("e2e");
  await expect(a.locator(".admin-facts")).toContainText("Asia/Karachi");
  await expect(a.getByRole("link", { name: "Map" })).toHaveAttribute("href", /openstreetmap\.org/);

  // Deleting needs the confirmation box.
  await a.getByText("Delete this visitor").click();
  await a.getByLabel(/Delete their details/).check();
  await a.getByRole("button", { name: "Delete visitor" }).click();
  await expect(a.getByRole("status")).toContainText("Visitor deleted");
  await a.goto(`/admin/visitors?q=${ip}`);
  await expect(a.locator("tbody tr")).toHaveCount(0);
  await context.close();
});

test("the admin's own browsing isn't logged, and the pages pass axe", async ({ browser }) => {
  const { context, page } = await admin(browser);
  const tracked = page.waitForResponse((r) => r.url().endsWith("/api/t"), { timeout: 3000 }).catch(() => null);
  await page.goto("/privacy");
  const res = await tracked;
  if (res) expect(res.status()).toBe(204);

  for (const path of ["/admin", "/admin/visitors", "/admin/rooms"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${path}: ${v.id}`)).toEqual([]);
  }
  const csv = await page.request.get("/api/admin/export?range=30");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).split("\r\n")[0]).toContain("first_seen");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/signed-out/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await context.close();
});

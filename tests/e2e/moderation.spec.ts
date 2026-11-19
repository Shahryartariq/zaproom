import { expect, test, type Browser } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "./admin-password";

/**
 * Admin moderation against a real LiveKit server and Postgres (the CI "calls" job):
 * remove and block someone, see them refused, lift the block, close the room.
 */
test.describe.configure({ retries: 0 });
test.skip(!process.env.E2E_DATABASE_URL, "Needs the visitor log database");

async function context(browser: Browser, ip: string, name?: string) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  if (name) {
    await ctx.addInitScript((n) => localStorage.setItem("zaproom:profile", JSON.stringify({ name: n, color: "mint" })), name);
  }
  return ctx;
}

test("the admin can remove and block someone, lift the block, and close the room", async ({ browser }) => {
  // Alice opens the lobby (so she has a visitor record) and starts a text room.
  const alice = await (await context(browser, "203.0.113.61", "Alice")).newPage();
  const tracked = alice.waitForResponse((r) => r.url().endsWith("/api/t") && r.status() === 200);
  await alice.goto("/");
  await tracked;
  const form = alice.locator("form.start-form");
  await form.getByLabel("Room name").fill("Moderation check");
  await form.getByText("Text", { exact: true }).click();
  await form.getByRole("button", { name: "Start room" }).click();
  // A new room says so, with the invite link right there.
  await expect(alice.getByRole("status").filter({ hasText: "Your room is ready." })).toBeVisible();
  await alice.getByRole("button", { name: "Join chat" }).click();
  await expect(alice.locator(".chat-app")).toBeVisible({ timeout: 20_000 });
  expect(new URL(alice.url()).search).toBe("");

  // The admin sees the room and Alice, linked to her visitor record.
  const admin = await (await context(browser, "203.0.113.62")).newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.goto("/admin/rooms");
  const room = admin.locator("section.panel", { hasText: "Moderation check" });
  const row = room.locator("li", { hasText: "Alice" });
  await expect(row.getByRole("link", { name: "Visitor" })).toBeVisible();
  await row.getByRole("button", { name: "Remove and block 24 h" }).click();
  await expect(admin.getByRole("status")).toContainText("blocked for 24 hours");

  // Alice is told why she left, and can't get back in.
  await expect(alice.getByText("You were removed from the room.")).toBeVisible({ timeout: 15_000 });
  await alice.getByRole("button", { name: "Rejoin" }).click();
  await alice.getByRole("button", { name: "Join chat" }).click();
  await expect(alice.getByRole("alert").filter({ hasText: "You can't join right now" })).toBeVisible();

  // Lifting the block lets her back in.
  await admin.goto("/admin/visitors?q=203.0.113.61");
  await admin.locator("tbody tr").first().getByRole("link").first().click();
  await expect(admin.locator(".admin-facts")).toContainText("Blocked until");
  await admin.getByRole("button", { name: "Lift the block" }).click();
  await expect(admin.getByRole("status")).toContainText("Block lifted");
  await alice.getByRole("button", { name: "Join chat" }).click();
  await expect(alice.locator(".chat-app")).toBeVisible({ timeout: 20_000 });

  // Closing the room disconnects everyone in it.
  await admin.goto("/admin/rooms");
  await admin.locator("section.panel", { hasText: "Moderation check" }).getByRole("button", { name: "Close room" }).click();
  await expect(admin.getByRole("status")).toContainText("Room closed");
  await expect(alice.getByText("The room closed.")).toBeVisible({ timeout: 15_000 });
});

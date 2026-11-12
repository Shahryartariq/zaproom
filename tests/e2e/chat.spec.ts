import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * Real text chat against a LiveKit server (CI runs `livekit-server --dev`).
 * Run with LIVEKIT_E2E=1 and the LIVEKIT_* variables set.
 */

// Retries would meet people left over from the first attempt, so each test runs once.
test.describe.configure({ retries: 0 });

type Person = { ctx: BrowserContext; page: Page };

async function person(browser: Browser, name: string, color: string): Promise<Person> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(
    ([n, c]) => {
      localStorage.setItem("zaproom:profile", JSON.stringify({ name: n, color: c }));
      // Count notification tones so tests can check the sound settings.
      (window as unknown as { __tones: number }).__tones = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args: Parameters<typeof start>) {
        (window as unknown as { __tones: number }).__tones++;
        return start.apply(this, args);
      };
    },
    [name, color],
  );
  const page = await ctx.newPage();
  return { ctx, page };
}

const tones = (p: Page) => p.evaluate(() => (window as unknown as { __tones: number }).__tones);
const composer = (p: Page) => p.getByLabel("Message", { exact: true });

async function say(p: Page, text: string) {
  await composer(p).fill(text);
  await composer(p).press("Enter");
}

async function openChat(p: Page) {
  await p.goto("/chat");
  await expect(p.locator(".chat-app")).toBeVisible({ timeout: 20_000 });
}

test("global chat, private messages, typing, seen ticks, sounds and saved history", async ({ browser }) => {
  test.setTimeout(150_000);
  const ann = await person(browser, "Ann", "mint");
  const ben = await person(browser, "Ben", "sky");
  const cat = await person(browser, "Cat", "rose");
  for (const p of [ann, ben, cat]) await openChat(p.page);

  // Everyone sees everyone else online.
  await expect(ann.page.getByRole("button", { name: "Message Ben" })).toBeVisible({ timeout: 20_000 });
  await expect(ann.page.getByRole("button", { name: "Message Cat" })).toBeVisible();

  // Global messages reach everyone, with the sender's name.
  await say(ann.page, "hello everyone");
  await expect(ben.page.locator(".chat-messages")).toContainText("hello everyone");
  await expect(cat.page.locator(".chat-messages .bubble-name")).toHaveText("Ann");
  await say(ben.page, "hi Ann");
  await expect(ann.page.locator(".chat-messages")).toContainText("hi Ann");
  // Ben is looking at the global chat, so Ann's message made no sound for him.
  expect(await tones(ben.page)).toBe(0);

  // Ann opens a private chat with Ben.
  await ann.page.getByRole("button", { name: "Message Ben" }).click();
  await expect(ann.page.locator(".chat-title h1")).toHaveText("Ben");
  await expect(ann.page.locator(".chat-title p")).toHaveText("online");

  // Typing shows on Ben's side once he's in the conversation; first the message arrives.
  await say(ann.page, "this is just for you");
  const benDm = ben.page.locator(".convo-item").filter({ has: ben.page.locator("strong", { hasText: /^Ann$/ }) });
  await expect(benDm).toContainText("this is just for you");
  await expect(benDm.locator(".unread")).toHaveText("1");
  // Ben was looking at the global chat: the private message rang.
  await expect.poll(() => tones(ben.page)).toBeGreaterThan(0);
  // Cat never receives it.
  await expect(cat.page.locator(".convo-item").filter({ has: cat.page.locator("strong", { hasText: /^Ann$/ }) })).toHaveCount(0);
  await expect(cat.page.locator(".chat-app")).not.toContainText("this is just for you");
  // Ann's message shows one tick until Ben opens it, then two.
  await expect(ann.page.locator(".bubble-row.mine .ticks").last()).toHaveAttribute("aria-label", "Sent");
  await benDm.click();
  await expect(ann.page.locator(".bubble-row.mine .ticks").last()).toHaveAttribute("aria-label", "Seen", { timeout: 10_000 });
  await expect(benDm.locator(".unread")).toHaveCount(0);

  await composer(ben.page).pressSequentially("typing slowly", { delay: 30 });
  await expect(ann.page.locator(".chat-title p")).toHaveText("typing…");
  await composer(ben.page).press("Enter");
  await expect(ann.page.locator(".chat-messages")).toContainText("typing slowly");
  await expect(ann.page.locator(".chat-title p")).toHaveText("online");

  // Unread badge on the global chat while Ann is in the private chat.
  await say(cat.page, "anyone around?");
  await expect(ann.page.locator(".convo-item", { hasText: "Global chat" }).locator(".unread")).toHaveText("1");

  // Ben reloads: his private chat with Ann is still there (saved on his device), and
  // his identity is the same, so Ann can keep writing to him.
  await ben.page.reload();
  await expect(ben.page.locator(".chat-app")).toBeVisible({ timeout: 20_000 });
  const saved = ben.page.locator(".convo-item").filter({ has: ben.page.locator("strong", { hasText: /^Ann$/ }) });
  await expect(saved).toBeVisible();
  await saved.click();
  await expect(ben.page.locator(".chat-messages")).toContainText("this is just for you");
  await expect(ann.page.locator(".chat-title p")).toHaveText("online", { timeout: 15_000 });
  await say(ann.page, "welcome back");
  await expect(ben.page.locator(".chat-messages")).toContainText("welcome back");

  // When Ben leaves, Ann can read the chat but not send.
  await ben.ctx.close();
  await expect(ann.page.locator(".chat-title p")).toHaveText("offline", { timeout: 45_000 });
  await expect(composer(ann.page)).toBeDisabled();
  await expect(ann.page.locator(".chat-note")).toContainText("went offline");

  await ann.ctx.close();
  await cat.ctx.close();
});

test("one tab at a time", async ({ browser }) => {
  const dee = await person(browser, "Dee", "lemon");
  await openChat(dee.page);
  const second = await dee.ctx.newPage();
  await openChat(second);
  await expect(dee.page.getByRole("heading", { name: "Chat is open in another tab" })).toBeVisible({ timeout: 15_000 });
  await dee.page.getByRole("button", { name: "Use it here" }).click();
  await expect(dee.page.locator(".chat-app")).toBeVisible({ timeout: 20_000 });
  await expect(second.getByRole("heading", { name: "Chat is open in another tab" })).toBeVisible({ timeout: 15_000 });
  await dee.ctx.close();
});

test("text-only room: no media, join notices, group chat and private messages", async ({ browser }) => {
  const host = await person(browser, "Hana", "coral");
  await host.page.goto("/");
  const form = host.page.locator("form.start-form");
  await form.getByLabel("Room name").fill("Book club");
  await form.getByText("Text", { exact: true }).click();
  await form.getByRole("button", { name: "Start room" }).click();
  await expect(host.page.getByText("Text room")).toBeVisible();
  const path = new URL(host.page.url()).pathname;
  await host.page.getByRole("button", { name: "Join chat" }).click();
  await expect(host.page.locator(".chat-app")).toBeVisible({ timeout: 20_000 });
  await expect(host.page.locator(".chat-title h1")).toHaveText("Book club");

  const guest = await person(browser, "Gus", "teal");
  await guest.page.goto(path);
  await guest.page.getByRole("button", { name: "Join chat" }).click();
  await expect(guest.page.locator(".chat-app")).toBeVisible({ timeout: 20_000 });

  await expect(host.page.locator(".system-line")).toHaveText("Gus joined");
  await say(guest.page, "which book this week?");
  await expect(host.page.locator(".chat-messages")).toContainText("which book this week?");

  // Emoji: search, insert at the caret, close with Escape; an emoji-only message shows large.
  await composer(guest.page).fill("great book ");
  await guest.page.getByRole("button", { name: "Add emoji" }).click();
  const panel = guest.page.getByRole("dialog", { name: "Emoji" });
  await panel.getByLabel("Search emoji").fill("fire");
  await panel.getByRole("button", { name: "fire", exact: true }).click();
  await expect(composer(guest.page)).toHaveValue("great book 🔥");
  await guest.page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await composer(guest.page).press("Enter");
  await expect(host.page.locator(".chat-messages")).toContainText("great book 🔥");
  await guest.page.getByRole("button", { name: "Add emoji" }).click();
  await expect(panel.locator("[data-group=Recent] button")).toHaveText(["🔥"]);
  await panel.locator("[data-group=Smileys]").getByRole("button", { name: "joy", exact: true }).click();
  await guest.page.getByRole("button", { name: "Close emoji" }).click();
  await composer(guest.page).press("Enter");
  await expect(host.page.locator(".chat-messages .big-emoji").last()).toHaveText("😂");
  await host.page.getByRole("button", { name: "Message Gus" }).click();
  await say(host.page, "psst, it's Dune");
  await expect(
    guest.page.locator(".convo-item").filter({ has: guest.page.locator("strong", { hasText: /^Hana$/ }) }),
  ).toContainText("psst, it's Dune");

  // No camera or microphone tracks anywhere.
  for (const p of [host.page, guest.page]) await expect(p.locator("video, audio")).toHaveCount(0);

  await host.page.locator(".convo-item", { hasText: "Book club" }).click();
  await guest.page.getByRole("button", { name: "Leave" }).click();
  await expect(guest.page.getByRole("heading", { name: "You left Book club" })).toBeVisible();
  await expect(host.page.locator(".system-line").last()).toHaveText("Gus left");
});

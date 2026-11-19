# Changelog

## Unreleased

- **Admin panel** at `/admin` (password from `ADMIN_PASSWORD`): live counts, a daily chart, top pages, countries, cities, sources, browsers, systems, devices and languages, and a feed of recent activity.
- **Visitor log** in Postgres: IP and approximate location, browser, device, screen, language, referrer and campaign tags, pages with time spent, names used, rooms created and joined, chat and stranger activity, and messages sent (counts only). Search, a timeline per visitor, CSV export and delete. Records are kept for a year.
- **Live rooms** for the admin: every open room with who is inside; close a room or remove a person.
- The privacy page lists everything the log records.
- **Blocking:** the admin can remove and block someone for 24 hours from the room list, or for 1 hour to 30 days from their visitor page, and lift it again.

### Fixed (flow, SEO, performance, workflow and security audit)
- Rooms: a server hiccup now offers **Try again** instead of saying the room has closed; error pages from the network (HTML) show a plain sentence instead of "Unexpected token <".
- New rooms say **"Your room is ready"** with the invite link (the `?new=1` flag was set but never read). The invite button no longer submits the form around it.
- Join and start buttons stay disabled until the page is ready, so an early click no longer just reloads the page.
- Calls and chats that can't connect (blocked network, server down) explain why instead of spinning on "Connecting…" forever.
- Camera and microphone problems during a call (blocked, busy, missing) now show a notice; cancelling the screen-share picker no longer throws.
- Meet a stranger: stopping or leaving while still joining the line no longer leaves you in it; a dropped connection to the line rejoins it instead of waiting forever; double clicks can't start two searches.
- Global chat: "Use it here" works without a saved name; being removed or failing to connect gets its own message.
- The strangers page no longer says "nothing is recorded" now that visits are logged; it says calls and messages are never recorded.
- Error pages for crashes (`error.tsx`, `global-error.tsx`), and a "Page not found" title on 404s.
- Admin sign-in limits are shared through the database (they were per server instance); cross-site requests are refused by `Sec-Fetch-Site`; chat and reaction floods are dropped on receipt.
- Fonts load through `next/font` with size-matched fallbacks: layout shift is now 0 on every page (it was up to 0.098), home LCP 2.6 s → 1.9 s. Admin styles load only on admin pages (public CSS 42 KB → 34 KB). The database pool allows 5 connections so the admin overview's queries run in parallel.
- Desktop notifications use a PNG icon (some systems don't show SVG icons).
- Workflows: Dependabot, CodeQL, a dependency audit step, job time limits, Postgres in the real-calls job and a moderation test there. The dev-only `minimatch` advisory is fixed with an override.

## 1.0.0 (2026-11-13)

The first stable release. Live at https://zaproom.vercel.app.

- **Rooms for up to 12 people:** video, voice, screen sharing with tab audio, in-call chat and emoji reactions. Public rooms in a live lobby, or link-only rooms that are never listed.
- **Meet a stranger:** random 1-to-1 matching in join order, with a Next button.
- **Global chat:** one group for everyone online, a live list of people and private messages, with typing indicators, unread counts and seen ticks. Private chats are saved on your device.
- **Text-only rooms** for up to 50 people.
- **Emoji picker** in every chat, with search and recently used emoji. Messages that are only emoji show large.
- **Settings:** six notification sounds with volume, per-chat switches, desktop notifications, Enter-to-send, theme and your name.
- **Search and sharing:** every page has its own title, description and social card; public room links preview with the room's name; structured data, a sitemap and installable icons.
- **Fast pages:** the call library loads only when you join, so the chat and stranger pages load about 180 KB lighter.

Pull requests: #1 rebuild, #2 text chat, #3 single join on first visit, #4 emoji picker, #5 SEO and speed.

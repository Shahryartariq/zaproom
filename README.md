# Zaproom

Video, voice and text rooms in the browser. Pick a name, start a room, step into one that's already talking, or get matched with a stranger for a one-to-one chat. No sign-up, nothing to install.

**Live demo:** https://zaproom.vercel.app

![A Zaproom call with three people and the chat open](docs/screenshots/call-dark.png)

## What it does

- **Rooms for up to 12 people** with video, voice, screen sharing (with tab audio), text chat and emoji reactions.
- **A live lobby.** Public rooms show who's inside and update every few seconds, along with how many people are online and how many are waiting to meet someone.
- **Private rooms** that only open from their link (`/r/k7f-2qxm-9zd`) and never appear in the lobby.
- **Voice-only rooms.** The server refuses camera tracks in them, so nobody can switch a camera on.
- **Meet a stranger.** Random one-to-one matching with the camera off by default. Press **Next** to skip, and if your match never connects you're put back in line automatically.
- **A pre-join screen** with a camera preview, a live mic meter, and camera and microphone pickers.
- **In the call:** speaking rings, mute indicators, connection quality bars, join and leave notices, an unread badge on chat, and clear messages when the connection drops or the room closes.
- **Light, dark and match-device themes** with no flash on load, a layout that works down to phone size, keyboard support throughout, and reduced motion respected.

| Live lobby | Light theme | On a phone |
| --- | --- | --- |
| ![Lobby listing two live rooms and who is inside](docs/screenshots/lobby-dark.png) | ![A four-person call in light theme with chat open](docs/screenshots/call-light.png) | ![A five-person call on a phone](docs/screenshots/call-phone.png) |

## How it works

```mermaid
flowchart LR
  B[Browser<br/>React + LiveKit client] -- "create room, get token,<br/>join stranger line" --> API[Next.js route handlers<br/>on Vercel]
  API -- "server SDK:<br/>rooms, participants, tokens" --> LK[(LiveKit Cloud<br/>SFU)]
  B <-- "WebRTC media, chat,<br/>reactions" --> LK
```

- **No database.** LiveKit is the source of truth. A room's name, topic, type and visibility live in its LiveKit metadata. The lobby is built from `listRooms` and `listParticipants`, and one lookup is shared by every visitor for 4 seconds.
- **Tokens are the only way in.** `/api/token` checks that the room exists and isn't full, then signs a 2-hour token for that one room. Voice rooms get a token that can't publish a camera. Nobody can create a room by guessing a name.
- **Stranger matching without shared memory.** Waiting means being connected to a hidden LiveKit room whose tokens can't publish anything, so closing the tab takes you out of line. Each poll lists that room and pairs people in join order (1st with 2nd, 3rd with 4th). Every request computes the same pairs, and both people get the same room id (a hash of the two identities), so two simultaneous polls on different serverless instances agree. Each poll carries an HMAC-signed ticket, so nobody can take someone else's match.
- **Chat and reactions** use LiveKit's data channels. Reactions are limited to six known emoji, and nothing is stored.

### Security and privacy

- A strict Content Security Policy with a per-request nonce and `strict-dynamic`. There are no inline styles: avatar colours are classes, not `style` attributes. `connect-src` allows only LiveKit.
- `Permissions-Policy` limits camera, microphone and screen capture to this site. Also set: HSTS, `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- Every API route checks the request's origin, size limit and schema (zod), and rate-limits by IP.
- Room pages are `noindex`, and their titles never include the room name. If analytics is on, `/r/<id>` is rewritten to `/r/room` before anything is sent.
- The lobby shows names only for public rooms. Private rooms and stranger chats only add to the total number of people online.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript (strict), LiveKit (`livekit-client`, `@livekit/components-react` hooks, `livekit-server-sdk`), zod and hand-written CSS. Vitest and Playwright (with axe) for tests, and GitHub Actions for CI. Fonts are Unbounded and Hanken Grotesk, self-hosted.

## Run it locally

You need Node 22+, pnpm, and a LiveKit server. Use either a free [LiveKit Cloud](https://cloud.livekit.io) project or a local one in Docker:

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev --bind 0.0.0.0 --node-ip 127.0.0.1
```

```bash
pnpm install
cp .env.example .env.local
# LiveKit Cloud: paste the URL, key and secret from Settings → Keys
# Local Docker:  LIVEKIT_URL=ws://localhost:7880  LIVEKIT_API_KEY=devkey  LIVEKIT_API_SECRET=secret
pnpm dev
```

Open http://localhost:3000 in two browser windows to call yourself.

| Variable | Required | What it's for |
| --- | --- | --- |
| `LIVEKIT_URL` | yes | `wss://<project>.livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | yes | Signing tokens and calling the LiveKit server API |
| `SITE_URL` | in production | Canonical links, sitemap and Open Graph |
| `GA_MEASUREMENT_ID` | no | Google Analytics 4 |
| `GOOGLE_SITE_VERIFICATION` | no | Search Console HTML-tag verification |

Without the LiveKit variables the site still runs and says that calls are switched off.

## Tests

```bash
pnpm lint && pnpm typecheck
pnpm test            # unit: validation, room ids, matching, tickets, rate limits
PW_CHROME=1 pnpm e2e # browser: lobby, forms, pre-join, themes, axe in both themes, headers, API guards (desktop + phone)
pnpm e2e:call        # real calls: needs a LiveKit server and the env vars above
```

CI runs everything on each pull request. The **calls** job starts `livekit-server --dev` in Docker, then two and three browser contexts with fake cameras and mics meet in a room. They check that video plays and audio is attached, chat goes both ways, mute and reactions show up, the lobby count updates and leaving works. A stranger match, a skip and a re-match are tested the same way. The screenshots above come from that job.

## Deploy

1. Import the repo on Vercel.
2. Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `SITE_URL` (Production).
3. Deploy. Previews without LiveKit keys still build and show the "calls are switched off" notice.

## Project layout

```
src/
  app/                 pages, route handlers (api/rooms, api/token, api/strangers/*), SEO files
  components/lobby/    live room list, start-a-room form
  components/room/     pre-join, call, tiles, controls, chat and people panel, reactions
  components/strangers stranger matching screen
  lib/                 validation, room metadata, pairing, signed tickets, rate limiting, LiveKit calls
  proxy.ts             per-request CSP nonce
tests/unit, tests/e2e
```

## History

This repo started in 2025 as **zapcall**, a two-person WebRTC demo (React 16, Socket.IO signalling, one STUN server). In November 2026 it was rebuilt as Zaproom on Next.js and LiveKit. The rebuild added group calls through a media server, a TURN relay for strict networks, chat, a lobby and stranger matching.

## License

MIT

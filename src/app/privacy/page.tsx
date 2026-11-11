import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Zaproom keeps (almost nothing) and how calls travel.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <article className="prose">
      <h1>Privacy</h1>
      <p>Zaproom has no accounts and no database. Here is everything that happens with your data.</p>

      <h2>Your name and colour</h2>
      <p>
        They are saved in your browser&apos;s local storage so you don&apos;t have to type them again. They are sent to the
        call server only while you are in a room, so other people can see who you are.
      </p>

      <h2>Calls and chat</h2>
      <p>
        Video, audio, screen sharing, chat and reactions travel through <a href="https://livekit.io">LiveKit Cloud</a>,
        encrypted in transit. Nothing is recorded. Chat messages are not stored anywhere: they disappear when you leave.
      </p>

      <h2>Text chat</h2>
      <p>
        Global chat and text-room messages go to everyone in that chat and are not saved anywhere. Private messages are
        delivered only to the person you write to. A copy of your private chats (the newest 100 messages per person) is
        kept in your own browser so you can pick them up later. Delete it any time in Settings.
      </p>
      <p>
        To recognise your browser in the global chat, Zaproom keeps a random key in it. The server turns that key into
        your chat identity with a one-way function, so nobody can use your identity without the key.
      </p>

      <h2>Settings and notifications</h2>
      <p>
        Your sound, volume and other settings stay in your browser. Notification sounds are generated in the browser;
        pop-up notifications only appear if you switch them on and your browser allows them.
      </p>

      <h2>The lobby</h2>
      <p>
        Rooms listed in the lobby show their name and the first names and colours of the people inside. Link-only
        rooms and stranger chats never appear there; they only add to the total number of people online.
      </p>

      <h2>Analytics</h2>
      <p>
        If Google Analytics is switched on for this site, it counts page views. Room links are replaced with a generic
        path before anything is sent, so private room addresses never reach it.
      </p>

      <h2>Camera and microphone</h2>
      <p>
        The browser asks before Zaproom can use them. You can turn either off at any time, and you can join a room
        without them to listen and chat.
      </p>
    </article>
  );
}

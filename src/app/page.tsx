import { Lobby } from "@/components/lobby/Lobby";

export default function Home() {
  return (
    <div className="lobby">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Rooms with the lights on.</h1>
        <p>
          Video, voice and chat in your browser. Pick a name, start a room or step into one that&apos;s already talking.
          No sign-up, nothing to install.
        </p>
      </section>
      <Lobby />
    </div>
  );
}

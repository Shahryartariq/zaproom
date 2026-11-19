import { Lobby } from "@/components/lobby/Lobby";
import { siteUrl } from "@/lib/config";
import { jsonLd, structuredData } from "@/lib/seo";

export default function Home() {
  return (
    <div className="lobby">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(siteUrl())) }} />
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

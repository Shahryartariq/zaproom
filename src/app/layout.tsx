import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Analytics } from "@/components/Analytics";
import { Logo } from "@/components/Icon";
import { NavLinks } from "@/components/NavLinks";
import { ProfileProvider } from "@/components/ProfileProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { gaId, siteUrl, siteVerification } from "@/lib/config";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const description =
  "Video, voice and text rooms in your browser. Pick a name, start a room, join one that's live, or meet a stranger one-to-one. No sign-up.";

export async function generateMetadata(): Promise<Metadata> {
  const verification = siteVerification();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: "Zaproom: video, voice and chat rooms", template: "%s | Zaproom" },
    description,
    applicationName: "Zaproom",
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: "Zaproom", title: "Zaproom", description, url: "/" },
    twitter: { card: "summary_large_image", title: "Zaproom", description },
    robots: { index: true, follow: true },
    ...(verification ? { verification: { google: verification } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#16122E",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const ga = gaId();
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <ProfileProvider>
          <header className="site-header">
            <Link href="/" className="wordmark" aria-label="Zaproom home">
              <Logo />
              zaproom
            </Link>
            <nav className="site-nav" aria-label="Main">
              <NavLinks />
              <SettingsButton />
            </nav>
          </header>
          <main id="main">{children}</main>
          <footer className="site-footer">
            <span>Built by Muhammad Shehryar with Next.js and LiveKit.</span>
            <a href="https://github.com/Shahryartariq/zaproom">Source on GitHub</a>
            <Link href="/privacy">Privacy</Link>
          </footer>
        </ProfileProvider>
        {ga ? <Analytics id={ga} nonce={nonce} /> : null}
      </body>
    </html>
  );
}

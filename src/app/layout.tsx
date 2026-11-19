import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Analytics } from "@/components/Analytics";
import { Logo } from "@/components/Icon";
import { NavLinks } from "@/components/NavLinks";
import { ProfileProvider } from "@/components/ProfileProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { gaId, siteUrl, siteVerification } from "@/lib/config";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME } from "@/lib/seo";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const description = HOME_DESCRIPTION;

export async function generateMetadata(): Promise<Metadata> {
  const verification = siteVerification();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: HOME_TITLE, template: `%s | ${SITE_NAME}` },
    description,
    applicationName: "Zaproom",
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: SITE_NAME, title: HOME_TITLE, description, url: "/", locale: "en_US" },
    twitter: { card: "summary_large_image", title: HOME_TITLE, description },
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

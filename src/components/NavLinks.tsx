"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; short?: string }[] = [
  { href: "/", label: "Rooms" },
  { href: "/chat", label: "Chat" },
  { href: "/strangers", label: "Meet a stranger", short: "Strangers" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
          {l.short ? (
            <>
              <span className="long">{l.label}</span>
              <span className="short" aria-hidden="true">
                {l.short}
              </span>
            </>
          ) : (
            l.label
          )}
        </Link>
      ))}
    </>
  );
}

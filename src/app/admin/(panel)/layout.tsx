import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { databaseUrl } from "@/lib/db";

export default async function AdminPanel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <nav className="admin-nav" aria-label="Admin">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/visitors">Visitors</Link>
        <Link href="/admin/rooms">Live rooms</Link>
        <form method="post" action="/api/admin/logout">
          <button className="btn ghost" type="submit">
            Sign out
          </button>
        </form>
      </nav>
      {databaseUrl() ? null : (
        <p className="admin-note admin-banner" role="status">
          No database is connected, so visits aren&apos;t being recorded. In Vercel, open the zaproom project → Storage → add
          Neon (free). It sets DATABASE_URL; redeploy and the log starts.
        </p>
      )}
      {children}
    </>
  );
}

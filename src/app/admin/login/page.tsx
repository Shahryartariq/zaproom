import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminPassword, isAdminRequest } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  wrong: "That password isn't right.",
  wait: "Too many tries. Wait 15 minutes and try again.",
  off: "The admin panel is switched off. Set ADMIN_PASSWORD (12 or more characters) in Vercel and redeploy.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdminRequest()) redirect("/admin");
  const params = await searchParams;
  const error = typeof params.error === "string" ? MESSAGES[params.error] : undefined;
  const enabled = !!adminPassword();

  return (
    <div className="admin-login">
      <form className="panel" method="post" action="/api/admin/login">
        <h1>Admin</h1>
        <p className="admin-muted">Visitors, live rooms and moderation for Zaproom.</p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {"signed-out" in params ? <p className="admin-note">You&apos;re signed out.</p> : null}
        {enabled ? (
          <>
            <label className="field">
              <span>Password</span>
              <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
            </label>
            <button className="btn primary big" type="submit">
              Sign in
            </button>
          </>
        ) : (
          <p className="admin-note">{MESSAGES.off}</p>
        )}
      </form>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ago } from "@/components/admin/format";
import { visitorsByIdentity } from "@/lib/admin.server";
import { liveKitConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { adminRooms, type AdminRoom } from "@/lib/livekit.server";

export const metadata: Metadata = { title: "Live rooms" };

const DONE: Record<string, string> = { closed: "Room closed. Everyone in it was disconnected.", removed: "Person removed from the room." };
const ERRORS: Record<string, string> = {
  livekit: "LiveKit isn't configured.",
  builtin: "The global chat and the stranger queue can't be closed. Remove people instead.",
  input: "That action wasn't understood.",
  failed: "LiveKit didn't accept that. The room may already be closed.",
};

export default async function AdminRooms({ searchParams }: PageProps<"/admin/rooms">) {
  const params = await searchParams;
  const cfg = liveKitConfig();
  let rooms: AdminRoom[] = [];
  let failed = false;
  if (cfg) rooms = await adminRooms(cfg).catch(() => ((failed = true), []));
  const sql = await db();
  const visitors = sql ? await visitorsByIdentity(sql, rooms.flatMap((r) => r.people.map((p) => p.identity))).catch(() => new Map<string, string>()) : new Map<string, string>();
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : failed ? "Couldn't reach LiveKit. Reload in a moment." : undefined;

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Live rooms</h1>
        <Link className="btn ghost" href="/admin/rooms">
          Refresh
        </Link>
      </header>
      {done ? <p className="admin-note" role="status">{done}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="admin-muted">Every open room, including link-only and stranger rooms. Closing a room disconnects everyone in it.</p>

      {rooms.length ? (
        <div className="admin-rooms">
          {rooms.map((room) => (
            <section className="panel" key={room.id}>
              <header className="admin-room-head">
                <div>
                  <h2>{room.label}</h2>
                  <p className="admin-muted">
                    {room.kind === "room" && room.meta ? `${room.meta.kind} · ${room.meta.visibility === "public" ? "listed" : "link only"} · ` : ""}
                    {room.people.length} {room.people.length === 1 ? "person" : "people"} · opened {ago(room.createdAt)}
                  </p>
                  {room.kind === "room" ? (
                    <p className="mono small">
                      <a href={`/r/${room.id}`}>/r/{room.id}</a>
                    </p>
                  ) : null}
                </div>
                {room.kind === "room" || room.kind === "stranger" ? (
                  <form method="post" action="/api/admin/rooms">
                    <input type="hidden" name="action" value="close" />
                    <input type="hidden" name="room" value={room.id} />
                    <button className="btn danger" type="submit">
                      Close room
                    </button>
                  </form>
                ) : null}
              </header>
              {room.people.length ? (
                <ul className="admin-people">
                  {room.people.map((p) => {
                    const visitor = visitors.get(p.identity);
                    return (
                      <li key={p.identity}>
                        <span>
                          <strong>{p.name}</strong>
                          <span className="admin-muted">
                            {" "}
                            · joined {ago(p.joinedAt)}
                            {p.publishing.length ? ` · ${[...new Set(p.publishing)].join(", ")} on` : ""}
                          </span>
                        </span>
                        {visitor ? <Link href={`/admin/visitors/${visitor}`}>Visitor</Link> : <span className="admin-muted">no record</span>}
                        <form method="post" action="/api/admin/rooms">
                          <input type="hidden" name="action" value="remove" />
                          <input type="hidden" name="room" value={room.id} />
                          <input type="hidden" name="identity" value={p.identity} />
                          <button className="btn ghost" type="submit">
                            Remove
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="admin-empty">Empty. LiveKit closes empty rooms after a few minutes.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p className="admin-empty">{cfg ? "No rooms are open right now." : "LiveKit isn't configured."}</p>
      )}
    </div>
  );
}

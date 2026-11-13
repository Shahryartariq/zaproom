import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/room/RoomScreen";
import { liveKitConfig } from "@/lib/config";
import { getRoom } from "@/lib/livekit.server";
import { isRoomId, type RoomMeta } from "@/lib/rooms";
import { SITE_NAME, socialCard } from "@/lib/seo";

const KIND: Record<RoomMeta["kind"], string> = { video: "Video room", voice: "Voice room", text: "Text chat room" };
const INVITE = "Open the link, pick a name and you're in. No sign-up, nothing to install.";

/** Gives up after a moment so a slow lookup never holds up the page. */
async function lookup(id: string): Promise<RoomMeta | null> {
  const cfg = liveKitConfig();
  if (!cfg) return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
  const room = getRoom(cfg, id)
    .then((r) => r?.meta ?? null)
    .catch(() => null);
  return Promise.race([room, timeout]);
}

/**
 * Invite links get a useful preview when pasted into a chat app. Only public rooms,
 * which are listed in the lobby anyway, show their name; link-only rooms stay private.
 * Room pages are never indexed.
 */
export async function generateMetadata({ params }: PageProps<"/r/[id]">): Promise<Metadata> {
  const { id } = await params;
  const robots = { index: false, follow: false };
  const meta = isRoomId(id) && !id.startsWith("s-") ? await lookup(id) : null;
  if (meta?.visibility === "public") {
    const title = `Join “${meta.title}” on ${SITE_NAME}`;
    const description = `${KIND[meta.kind]}${meta.topic ? `: ${meta.topic}` : ""}. ${INVITE}`;
    return {
      title: { absolute: title },
      description,
      robots,
      ...socialCard(`/r/${id}`, title, description),
    };
  }
  const title = `You're invited to a room on ${SITE_NAME}`;
  return {
    title: "Join a room",
    description: INVITE,
    robots,
    ...socialCard(`/r/${id}`, title, INVITE),
  };
}

export default async function RoomPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  if (!isRoomId(id) || id.startsWith("s-")) notFound();
  return <RoomScreen id={id} />;
}

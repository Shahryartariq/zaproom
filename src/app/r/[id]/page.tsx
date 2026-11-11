import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/room/RoomScreen";
import { isRoomId } from "@/lib/rooms";

// Room names stay out of the title: private rooms are meant to stay private.
export const metadata: Metadata = {
  title: "Join a room",
  robots: { index: false, follow: false },
};

export default async function RoomPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  if (!isRoomId(id) || id.startsWith("s-")) notFound();
  return <RoomScreen id={id} />;
}

import { liveKitConfig } from "@/lib/config";
import { adminGuard, backTo } from "@/lib/admin-route";
import { closeRoom, removePerson } from "@/lib/livekit.server";
import { LOUNGE_ROOM, QUEUE_ROOM } from "@/lib/rooms";

const NAME = /^[\w.:-]{1,128}$/;

/** Close a room, or remove one person from it. */
export async function POST(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const cfg = liveKitConfig();
  if (!cfg) return backTo(req, "/admin/rooms?error=livekit");

  const form = await req.formData().catch(() => null);
  const action = form?.get("action");
  const room = form?.get("room");
  const identity = form?.get("identity");
  if (typeof room !== "string" || !NAME.test(room)) return backTo(req, "/admin/rooms?error=input");

  try {
    if (action === "close") {
      // The global chat and the stranger queue are built in; remove people from them instead.
      if (room === LOUNGE_ROOM || room === QUEUE_ROOM) return backTo(req, "/admin/rooms?error=builtin");
      await closeRoom(cfg, room);
      return backTo(req, "/admin/rooms?done=closed");
    }
    if (action === "remove" && typeof identity === "string" && NAME.test(identity)) {
      await removePerson(cfg, room, identity);
      return backTo(req, "/admin/rooms?done=removed");
    }
    return backTo(req, "/admin/rooms?error=input");
  } catch (e) {
    console.error("[admin] room action failed", e);
    return backTo(req, "/admin/rooms?error=failed");
  }
}

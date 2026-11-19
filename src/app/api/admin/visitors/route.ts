import { adminGuard, backTo } from "@/lib/admin-route";
import { deleteVisitor } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/visitors";

/** Delete everything recorded about one visitor (for "please remove my data" requests). */
export async function POST(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const sql = await db();
  const form = await req.formData().catch(() => null);
  const id = form?.get("id");
  if (!sql || !isUuid(id) || form?.get("confirm") !== "delete") return backTo(req, "/admin/visitors?error=delete");
  await deleteVisitor(sql, id);
  return backTo(req, "/admin/visitors?done=deleted");
}

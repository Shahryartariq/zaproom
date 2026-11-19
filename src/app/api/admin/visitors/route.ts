import { adminGuard, backTo } from "@/lib/admin-route";
import { deleteVisitor } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/visitors";
import { BLOCK_HOURS, blockVisitor, unblockVisitor } from "@/lib/visitors.server";

/** Block, unblock or delete one visitor. */
export async function POST(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const sql = await db();
  const form = await req.formData().catch(() => null);
  const id = form?.get("id");
  const action = form?.get("action") ?? "delete";
  if (!sql || !isUuid(id)) return backTo(req, "/admin/visitors?error=input");
  const page = `/admin/visitors/${id}`;

  if (action === "block") {
    const hours = Number(form?.get("hours"));
    if (!BLOCK_HOURS.includes(hours as (typeof BLOCK_HOURS)[number])) return backTo(req, `${page}?error=input`);
    return backTo(req, (await blockVisitor(sql, id, hours, "Blocked from the visitor page")) ? `${page}?done=blocked` : `${page}?error=input`);
  }
  if (action === "unblock") {
    await unblockVisitor(sql, id);
    return backTo(req, `${page}?done=unblocked`);
  }
  if (action === "delete" && form?.get("confirm") === "delete") {
    await deleteVisitor(sql, id);
    return backTo(req, "/admin/visitors?done=deleted");
  }
  return backTo(req, `${page}?error=confirm`);
}

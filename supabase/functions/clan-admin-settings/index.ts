import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json();
  const { clan_id, action } = body;
  if (!clan_id || !action) return jsonResponse({ error: "clan_id and action are required" }, 400);

  const svc = getServiceClient();
  const { data: caller } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!caller) return jsonResponse({ error: "not a member of this clan" }, 403);

  if (action === "remove_member") {
    if (!["admin", "deputy"].includes(caller.role)) return jsonResponse({ error: "not permitted" }, 403);
    const { person_id } = body;
    if (!person_id) return jsonResponse({ error: "person_id is required" }, 400);
    const { data: target } = await svc.from("persons").select("role").eq("id", person_id).eq("clan_id", clan_id).single();
    if (!target) return jsonResponse({ error: "person not found in this clan" }, 404);
    if (target.role === "admin") return jsonResponse({ error: "cannot remove the admin" }, 409);
    await svc.from("persons").update({ linked_user_id: null, role: null }).eq("id", person_id);
    return jsonResponse({});
  }

  if (!["admin"].includes(caller.role)) return jsonResponse({ error: "not permitted" }, 403);

  if (action === "update_settings") {
    const { name, invite_permission } = body;
    if (invite_permission && !["admin_only", "all_members"].includes(invite_permission)) {
      return jsonResponse({ error: "invalid invite_permission" }, 400);
    }
    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if (invite_permission) update.invite_permission = invite_permission;
    await svc.from("clans").update(update).eq("id", clan_id);
    return jsonResponse({});
  }

  if (action === "appoint_deputy" || action === "remove_deputy") {
    const { person_id } = body;
    if (!person_id) return jsonResponse({ error: "person_id is required" }, 400);
    const { data: target } = await svc.from("persons").select("role").eq("id", person_id).eq("clan_id", clan_id).single();
    if (!target) return jsonResponse({ error: "person not found in this clan" }, 404);
    if (target.role === "admin") return jsonResponse({ error: "cannot change the admin's role this way" }, 409);
    await svc.from("persons").update({ role: action === "appoint_deputy" ? "deputy" : "member" }).eq("id", person_id);
    return jsonResponse({});
  }

  return jsonResponse({ error: "unsupported action" }, 400);
});

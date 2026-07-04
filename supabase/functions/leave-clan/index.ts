import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { clan_id } = await req.json();
  if (!clan_id) return jsonResponse({ error: "clan_id is required" }, 400);

  const svc = getServiceClient();
  const { data: caller } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!caller) return jsonResponse({ error: "not a member of this clan" }, 403);

  if (caller.role === "admin") {
    return jsonResponse({ error: "transfer admin role before leaving" }, 409);
  }

  await svc.from("persons").update({ linked_user_id: null, role: null }).eq("id", caller.id);
  return jsonResponse({});
});

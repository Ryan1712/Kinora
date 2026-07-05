import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { clan_id, proposed_relationship_type, proposed_relationship_with_person_id } = await req.json();
  if (!clan_id || !proposed_relationship_type || !proposed_relationship_with_person_id) {
    return jsonResponse({ error: "missing required fields" }, 400);
  }
  if (!["parent_child", "spouse"].includes(proposed_relationship_type)) {
    return jsonResponse({ error: "invalid proposed_relationship_type" }, 400);
  }

  const svc = getServiceClient();
  const { data: person } = await svc
    .from("persons")
    .select("id")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!person) return jsonResponse({ error: "not a member of this clan" }, 403);

  const { data: targetPerson } = await svc
    .from("persons")
    .select("id")
    .eq("id", proposed_relationship_with_person_id)
    .eq("clan_id", clan_id)
    .maybeSingle();
  if (!targetPerson) return jsonResponse({ error: "target person not found in this clan" }, 404);

  const { data: request, error } = await svc
    .from("relationship_change_requests")
    .insert({
      clan_id,
      person_id: person.id,
      proposed_relationship_type,
      proposed_relationship_with_person_id,
    })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ request_id: request.id });
});

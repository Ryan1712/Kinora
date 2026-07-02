import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json();
  const { name, branch_type, admin_full_name, admin_generation_number } = body;
  if (!name || !branch_type || !admin_full_name || typeof admin_generation_number !== "number") {
    return jsonResponse({ error: "missing required fields" }, 400);
  }
  if (!["noi", "ngoai", "khac"].includes(branch_type)) {
    return jsonResponse({ error: "invalid branch_type" }, 400);
  }

  const svc = getServiceClient();
  const { data: clan, error: clanErr } = await svc
    .from("clans")
    .insert({ name, branch_type, created_by: userId })
    .select()
    .single();
  if (clanErr) return jsonResponse({ error: clanErr.message }, 500);

  const { data: person, error: personErr } = await svc
    .from("persons")
    .insert({
      clan_id: clan.id,
      full_name: admin_full_name,
      generation_number: admin_generation_number,
      linked_user_id: userId,
      role: "admin",
    })
    .select()
    .single();
  if (personErr) {
    // Clean up the clan row that was just created if person insert fails
    await svc.from("clans").delete().eq("id", clan.id);
    return jsonResponse({ error: personErr.message }, 500);
  }

  return jsonResponse({ clan_id: clan.id, person_id: person.id });
});

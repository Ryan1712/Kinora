import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { invite_id, action } = await req.json();
  if (!invite_id || !["accept", "decline"].includes(action)) {
    return jsonResponse({ error: "invite_id and a valid action are required" }, 400);
  }

  const svc = getServiceClient();
  const { data: invite, error: fetchErr } = await svc
    .from("invites")
    .select("*")
    .eq("id", invite_id)
    .single();
  if (fetchErr || !invite) return jsonResponse({ error: "invite not found" }, 404);
  if (invite.invitee_user_id !== userId) return jsonResponse({ error: "not your invite" }, 403);
  if (invite.status !== "pending") return jsonResponse({ error: "invite already resolved" }, 409);

  if (action === "decline") {
    await svc.from("invites").update({ status: "declined" }).eq("id", invite_id);
    return jsonResponse({});
  }

  const { data: target, error: targetErr } = await svc
    .from("persons")
    .select("generation_number")
    .eq("id", invite.proposed_relationship_with_person_id)
    .single();
  if (targetErr || !target) return jsonResponse({ error: "relationship target not found" }, 500);

  const generation = invite.resolved_generation;

  const { data: person, error: personErr } = await svc
    .from("persons")
    .insert({
      clan_id: invite.clan_id,
      full_name: invite.invitee_full_name,
      gender: invite.invitee_gender,
      generation_number: generation,
      linked_user_id: userId,
      role: "member",
    })
    .select()
    .single();
  if (personErr) return jsonResponse({ error: personErr.message }, 500);

  // relationships convention: from_person_id = parent/ancestor, to_person_id = child/descendant
  // (see would_create_cycle / shift_descendant_generations, which walk from_person_id -> to_person_id
  // as ancestor -> descendant). For spouse, direction is arbitrary (no hierarchy). For parent_child,
  // whichever side has the lower generation_number is the parent.
  let fromId: string;
  let toId: string;
  if (invite.proposed_relationship_type === "spouse") {
    fromId = person.id;
    toId = invite.proposed_relationship_with_person_id;
  } else if (generation < target.generation_number) {
    fromId = person.id; // new person is the parent (older generation)
    toId = invite.proposed_relationship_with_person_id;
  } else {
    fromId = invite.proposed_relationship_with_person_id; // target is the parent
    toId = person.id;
  }
  const { error: relErr } = await svc.from("relationships").insert({
    clan_id: invite.clan_id,
    from_person_id: fromId,
    to_person_id: toId,
    type: invite.proposed_relationship_type,
  });
  if (relErr) return jsonResponse({ error: relErr.message }, 500);

  await svc.from("invites").update({ status: "accepted" }).eq("id", invite_id);
  return jsonResponse({ person_id: person.id });
});

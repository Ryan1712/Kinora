import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { request_id, action } = await req.json();
  if (!request_id || !["approve", "reject"].includes(action)) {
    return jsonResponse({ error: "request_id and a valid action are required" }, 400);
  }

  const svc = getServiceClient();
  const { data: changeRequest } = await svc
    .from("relationship_change_requests")
    .select("*")
    .eq("id", request_id)
    .single();
  if (!changeRequest) return jsonResponse({ error: "request not found" }, 404);
  if (changeRequest.status !== "pending") return jsonResponse({ error: "request already reviewed" }, 409);

  const { data: reviewerPerson } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", changeRequest.clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!reviewerPerson || !["admin", "deputy"].includes(reviewerPerson.role)) {
    return jsonResponse({ error: "not permitted to review requests in this clan" }, 403);
  }

  if (action === "reject") {
    await svc
      .from("relationship_change_requests")
      .update({ status: "rejected", reviewed_by_person_id: reviewerPerson.id, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);
    return jsonResponse({});
  }

  const personId = changeRequest.person_id;
  const targetId = changeRequest.proposed_relationship_with_person_id;

  if (changeRequest.proposed_relationship_type === "parent_child") {
    const { data: cycleCheck } = await svc.rpc("would_create_cycle", {
      p_parent_id: targetId,
      p_child_id: personId,
    });
    if (cycleCheck) return jsonResponse({ error: "this change would create a cycle in the tree" }, 409);

    const { data: target } = await svc.from("persons").select("generation_number, gender").eq("id", targetId).single();
    const { data: person } = await svc.from("persons").select("generation_number").eq("id", personId).single();
    const newGeneration = target!.generation_number + 1;
    const delta = newGeneration - person!.generation_number;

    const { data: existingParents, error: existingParentsErr } = await svc
      .from("relationships")
      .select("id, from_person_id, persons!relationships_from_person_id_fkey(gender)")
      .eq("to_person_id", personId)
      .eq("type", "parent_child");
    if (existingParentsErr) return jsonResponse({ error: existingParentsErr.message }, 500);

    const targetGender = (target!.gender ?? "unknown") as "male" | "female" | "unknown";
    const parentsToReplace = (existingParents ?? []).filter((row: any) => {
      const existingGender = row.persons?.gender ?? "unknown";
      if (targetGender === "unknown") return existingGender === "unknown";
      return existingGender === targetGender;
    });
    if (parentsToReplace.length === 0 && (existingParents?.length ?? 0) >= 2) {
      return jsonResponse({ error: "this person already has two recorded parents" }, 409);
    }

    if (parentsToReplace.length > 0) {
      const { error: deleteErr } = await svc
        .from("relationships")
        .delete()
        .in("id", parentsToReplace.map((row: any) => row.id));
      if (deleteErr) return jsonResponse({ error: deleteErr.message }, 500);
    }

    const { error: insertErr } = await svc
      .from("relationships")
      .insert({ clan_id: changeRequest.clan_id, from_person_id: targetId, to_person_id: personId, type: "parent_child" });
    if (insertErr) return jsonResponse({ error: insertErr.message }, 500);

    await svc.from("persons").update({ generation_number: newGeneration }).eq("id", personId);
    if (delta !== 0) {
      await svc.rpc("shift_descendant_generations", { p_person_id: personId, p_delta: delta });
    }
  } else {
    const { data: target } = await svc.from("persons").select("generation_number").eq("id", targetId).single();
    const { data: person } = await svc.from("persons").select("generation_number").eq("id", personId).single();
    if (target!.generation_number !== person!.generation_number) {
      return jsonResponse({ error: "spouses must be the same generation" }, 409);
    }

    const { data: existingSpouse } = await svc
      .from("relationships")
      .select("id")
      .eq("type", "spouse")
      .or(
        `from_person_id.eq.${personId},to_person_id.eq.${personId},from_person_id.eq.${targetId},to_person_id.eq.${targetId}`,
      );
    if (existingSpouse && existingSpouse.length > 0) {
      return jsonResponse({ error: "person or target already has a recorded spouse" }, 409);
    }

    const { error: insertErr } = await svc
      .from("relationships")
      .insert({ clan_id: changeRequest.clan_id, from_person_id: personId, to_person_id: targetId, type: "spouse" });
    if (insertErr) return jsonResponse({ error: insertErr.message }, 500);
  }

  await svc
    .from("relationship_change_requests")
    .update({ status: "approved", reviewed_by_person_id: reviewerPerson.id, reviewed_at: new Date().toISOString() })
    .eq("id", request_id);

  return jsonResponse({});
});

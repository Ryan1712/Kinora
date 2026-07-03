import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";
import { resolveDirectTarget, RelationCode } from "../_shared/relations.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json();
  const {
    clan_id, anchor_person_id, relation_code,
    invitee_full_name, invitee_gender, invitee_user_id, invitee_phone_or_email,
  } = body;

  if (!clan_id || !anchor_person_id || !relation_code || !invitee_full_name) {
    return jsonResponse({ error: "missing required fields" }, 400);
  }
  if (!invitee_user_id && !invitee_phone_or_email) {
    return jsonResponse({ error: "invitee_user_id or invitee_phone_or_email is required" }, 400);
  }

  const svc = getServiceClient();

  const { data: clan } = await svc.from("clans").select("invite_permission").eq("id", clan_id).single();
  if (!clan) return jsonResponse({ error: "clan not found" }, 404);

  const { data: callerPerson } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!callerPerson) return jsonResponse({ error: "not a member of this clan" }, 403);

  const canInvite = clan.invite_permission === "all_members" || ["admin", "deputy"].includes(callerPerson.role);
  if (!canInvite) return jsonResponse({ error: "not permitted to invite in this clan" }, 403);

  let target;
  try {
    target = await resolveDirectTarget(svc, clan_id, anchor_person_id, relation_code as RelationCode);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 400);
  }

  const { data: invite, error: inviteErr } = await svc
    .from("invites")
    .insert({
      clan_id,
      invited_by_person_id: callerPerson.id,
      invitee_user_id: invitee_user_id ?? null,
      invitee_phone_or_email: invitee_phone_or_email ?? null,
      invitee_full_name,
      invitee_gender: invitee_gender ?? "unknown",
      proposed_relationship_type: target.type,
      proposed_relationship_with_person_id: target.counterpartPersonId,
    })
    .select()
    .single();
  if (inviteErr) return jsonResponse({ error: inviteErr.message }, 500);

  return jsonResponse({ invite_id: invite.id, resolved_generation: target.newPersonGeneration });
});

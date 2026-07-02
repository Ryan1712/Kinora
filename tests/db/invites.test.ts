import { describe, it, expect, beforeAll } from "vitest";
import { serviceClient, createTestUser, signInAs } from "../helpers/client";

const admin = serviceClient();
let clanId: string, inviterPersonId: string, anchorPersonId: string;
let inviterEmail: string, inviteeEmail: string, inviteeUserId: string;

beforeAll(async () => {
  inviterEmail = `inviter-${Date.now()}@example.com`;
  const inviter = await createTestUser(inviterEmail, "password123");
  await admin.from("users").insert({ id: inviter.id, full_name: "Inviter" });
  const { data: clan } = await admin
    .from("clans")
    .insert({ name: "Ho Invite", branch_type: "noi", created_by: inviter.id })
    .select()
    .single();
  clanId = clan!.id;
  const { data: person } = await admin
    .from("persons")
    .insert({ clan_id: clanId, full_name: "Inviter", generation_number: 15, linked_user_id: inviter.id, role: "admin" })
    .select()
    .single();
  inviterPersonId = person!.id;
  anchorPersonId = person!.id;

  inviteeEmail = `invitee-${Date.now()}@example.com`;
  const invitee = await createTestUser(inviteeEmail, "password123");
  inviteeUserId = invitee.id;
  await admin.from("users").insert({ id: invitee.id, full_name: "Invitee" });
});

describe("invites table", () => {
  it("is visible to inviter and invitee, invisible to unrelated clan members, and rejects a second pending invite", async () => {
    const { data: invite, error } = await admin
      .from("invites")
      .insert({
        clan_id: clanId,
        invited_by_person_id: inviterPersonId,
        invitee_user_id: inviteeUserId,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: anchorPersonId,
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(invite!.status).toBe("pending");

    const { error: dupErr } = await admin.from("invites").insert({
      clan_id: clanId,
      invited_by_person_id: inviterPersonId,
      invitee_user_id: inviteeUserId,
      proposed_relationship_type: "parent_child",
      proposed_relationship_with_person_id: anchorPersonId,
    });
    expect(dupErr).not.toBeNull();

    const inviterClient = await signInAs(inviterEmail, "password123");
    const { data: seenByInviter } = await inviterClient
      .from("invites")
      .select("id")
      .eq("id", invite!.id);
    expect(seenByInviter).toHaveLength(1);

    const inviteeClient = await signInAs(inviteeEmail, "password123");
    const { data: seenByInvitee } = await inviteeClient
      .from("invites")
      .select("id")
      .eq("id", invite!.id);
    expect(seenByInvitee).toHaveLength(1);
  });
});

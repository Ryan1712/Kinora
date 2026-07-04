import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

async function setupInvite() {
  const svc = serviceClient();
  const adminEmail = `radm-${Date.now()}-${Math.random()}@example.com`;
  const adminUser = await createTestUser(adminEmail, "password123");
  await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
  const { data: clan } = await svc
    .from("clans")
    .insert({ name: "Ho Respond", branch_type: "noi", created_by: adminUser.id })
    .select()
    .single();
  const { data: adminPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
    .select()
    .single();

  const inviteeEmail = `rinv-${Date.now()}@example.com`;
  const inviteeUser = await createTestUser(inviteeEmail, "password123");
  await svc.from("users").insert({ id: inviteeUser.id, full_name: "Invitee" });

  const { data: invite } = await svc
    .from("invites")
    .insert({
      clan_id: clan!.id,
      invited_by_person_id: adminPerson!.id,
      invitee_user_id: inviteeUser.id,
      invitee_full_name: "Pham Van Toan",
      invitee_gender: "male",
      proposed_relationship_type: "parent_child",
      proposed_relationship_with_person_id: adminPerson!.id,
      resolved_generation: 14,
    })
    .select()
    .single();

  return { svc, clan: clan!, adminPerson: adminPerson!, inviteeEmail, invite: invite! };
}

describe("respond-invite function", () => {
  it("accept: creates a linked person, generation = anchor - 1, relationship edge, and marks invite accepted", async () => {
    const { svc, adminPerson, inviteeEmail, invite } = await setupInvite();
    const client = await signInAs(inviteeEmail, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: invite.id, action: "accept" }),
    });
    expect(res.status).toBe(200);
    const responseBody = await res.json();

    const { data: person } = await svc.from("persons").select("*").eq("id", responseBody.person_id).single();
    expect(person!.generation_number).toBe(14);
    expect(person!.role).toBe("member");

    const { data: rel } = await svc
      .from("relationships")
      .select("*")
      .eq("from_person_id", person!.id)
      .eq("to_person_id", adminPerson.id)
      .eq("type", "parent_child");
    expect(rel).toHaveLength(1);

    const { data: updatedInvite } = await svc.from("invites").select("status").eq("id", invite.id).single();
    expect(updatedInvite!.status).toBe("accepted");
  });

  it("decline: marks invite declined and creates no person", async () => {
    const { svc, inviteeEmail, invite } = await setupInvite();
    const client = await signInAs(inviteeEmail, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: invite.id, action: "decline" }),
    });
    expect(res.status).toBe(200);

    const { data: updatedInvite } = await svc.from("invites").select("status").eq("id", invite.id).single();
    expect(updatedInvite!.status).toBe("declined");
  });

  it("rejects response from a user who is not the invitee", async () => {
    const { inviteeEmail: _unused, invite } = await setupInvite();
    const strangerEmail = `stranger-${Date.now()}@example.com`;
    await createTestUser(strangerEmail, "password123");
    const client = await signInAs(strangerEmail, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: invite.id, action: "accept" }),
    });
    expect(res.status).toBe(403);
  });

  it("accept (son): new person is placed a generation BELOW the anchor and the relationship edge is not inverted", async () => {
    // Regression test: resolveDirectTarget computes newPersonGeneration = anchor + 1 for
    // "son", but respond-invite used to blindly recompute target.generation_number - 1 for
    // any non-spouse invite, which is only correct for father/mother/grandparent-style
    // invites. That produced a wrong generation AND an inverted parent/child edge for
    // son/daughter/sibling/*_sibling invites. This test goes through the real
    // create-clan -> invite-member -> respond-invite flow so resolved_generation is set
    // by the real resolver, not a hand-picked fixture value.
    const svc = serviceClient();
    const adminEmail = `rsonadm-${Date.now()}-${Math.random()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const adminClient = await signInAs(adminEmail, "password123");
    const adminToken = await accessTokenFor(adminClient);

    const clanRes = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ho Son Regression",
        branch_type: "noi",
        admin_full_name: "Admin",
        admin_generation_number: 15,
      }),
    });
    expect(clanRes.status).toBe(200);
    const clanBody = await clanRes.json();
    const clanId = clanBody.clan_id;
    const anchorPersonId = clanBody.person_id;

    const inviteeEmail = `rsoninv-${Date.now()}@example.com`;
    const inviteeUser = await createTestUser(inviteeEmail, "password123");
    await svc.from("users").insert({ id: inviteeUser.id, full_name: "Con Trai" });

    const inviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanId,
        anchor_person_id: anchorPersonId,
        relation_code: "son",
        invitee_full_name: "Con Trai",
        invitee_gender: "male",
        invitee_user_id: inviteeUser.id,
      }),
    });
    expect(inviteRes.status).toBe(200);
    const inviteBody = await inviteRes.json();
    expect(inviteBody.resolved_generation).toBe(16);

    const inviteeClient = await signInAs(inviteeEmail, "password123");
    const inviteeToken = await accessTokenFor(inviteeClient);

    const respondRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteBody.invite_id, action: "accept" }),
    });
    expect(respondRes.status).toBe(200);
    const respondBody = await respondRes.json();

    const { data: anchorPerson } = await svc
      .from("persons")
      .select("generation_number")
      .eq("id", anchorPersonId)
      .single();
    const { data: newPerson } = await svc
      .from("persons")
      .select("generation_number")
      .eq("id", respondBody.person_id)
      .single();
    expect(newPerson!.generation_number).toBe(anchorPerson!.generation_number + 1);

    const { data: rel } = await svc
      .from("relationships")
      .select("*")
      .eq("from_person_id", anchorPersonId)
      .eq("to_person_id", respondBody.person_id)
      .eq("type", "parent_child");
    expect(rel).toHaveLength(1);
  });
});

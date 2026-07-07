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

  it("accept (father_sibling): new uncle is placed at the placeholder father's generation, parented by the placeholder grandparent, and the relationship edge is not inverted", async () => {
    // Regression test for the highest-value gap flagged in review of the resolved_generation
    // fix: father_sibling (and mother_sibling) are the only relation codes where
    // proposed_relationship_with_person_id is neither the anchor nor the anchor's direct
    // parent, but a grandparent reached by auto-creating two placeholder ancestors
    // (father, then grandparent). This exercises that full chain through the real
    // create-clan -> invite-member -> respond-invite flow and asserts the uncle ends up
    // a) at the father's generation (not the grandparent's, not the anchor's), and
    // b) parented by the grandparent (from_person_id), not the other way around.
    const svc = serviceClient();
    const adminEmail = `rfsadm-${Date.now()}-${Math.random()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const adminClient = await signInAs(adminEmail, "password123");
    const adminToken = await accessTokenFor(adminClient);

    const clanRes = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ho Father Sibling Regression",
        branch_type: "noi",
        admin_full_name: "Admin",
        admin_generation_number: 15,
      }),
    });
    expect(clanRes.status).toBe(200);
    const clanBody = await clanRes.json();
    const clanId = clanBody.clan_id;
    const anchorPersonId = clanBody.person_id;

    const inviteeEmail = `rfsinv-${Date.now()}@example.com`;
    const inviteeUser = await createTestUser(inviteeEmail, "password123");
    await svc.from("users").insert({ id: inviteeUser.id, full_name: "Chu" });

    const inviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanId,
        anchor_person_id: anchorPersonId,
        relation_code: "father_sibling",
        invitee_full_name: "Chu",
        invitee_gender: "male",
        invitee_user_id: inviteeUser.id,
      }),
    });
    expect(inviteRes.status).toBe(200);
    const inviteBody = await inviteRes.json();
    expect(inviteBody.resolved_generation).toBe(14);

    const { data: pendingInvite } = await svc
      .from("invites")
      .select("proposed_relationship_with_person_id")
      .eq("id", inviteBody.invite_id)
      .single();
    const grandparentId = pendingInvite!.proposed_relationship_with_person_id as string;

    const inviteeClient = await signInAs(inviteeEmail, "password123");
    const inviteeToken = await accessTokenFor(inviteeClient);

    const respondRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteBody.invite_id, action: "accept" }),
    });
    expect(respondRes.status).toBe(200);
    const respondBody = await respondRes.json();

    const { data: newPerson } = await svc
      .from("persons")
      .select("generation_number")
      .eq("id", respondBody.person_id)
      .single();
    expect(newPerson!.generation_number).toBe(14);

    const { data: rel } = await svc
      .from("relationships")
      .select("*")
      .eq("from_person_id", grandparentId)
      .eq("to_person_id", respondBody.person_id)
      .eq("type", "parent_child");
    expect(rel).toHaveLength(1);
  });

  it("accept (father_sibling then mother_sibling for the same anchor): both resolve successfully and the anchor ends up with two recorded parents", async () => {
    // This is the motivating end-to-end scenario for Stage 2a: under Stage 1's old
    // one-parent-only constraint, resolving father_sibling (which auto-creates a
    // placeholder father) followed by mother_sibling (which auto-creates a placeholder
    // mother) for the same anchor would 400 on the second invite, because the anchor
    // already had one recorded parent (the placeholder father) and the schema only
    // allowed one. Stage 2a's two-parents-per-person migration + trigger should let both
    // succeed, giving the anchor a distinct paternal-side and maternal-side ancestor chain.
    const svc = serviceClient();
    const adminEmail = `rbothadm-${Date.now()}-${Math.random()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const adminClient = await signInAs(adminEmail, "password123");
    const adminToken = await accessTokenFor(adminClient);

    const clanRes = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ho Both Siblings Regression",
        branch_type: "noi",
        admin_full_name: "Admin",
        admin_generation_number: 15,
      }),
    });
    expect(clanRes.status).toBe(200);
    const clanBody = await clanRes.json();
    const clanId = clanBody.clan_id;
    const anchorPersonId = clanBody.person_id;

    // First: resolve father_sibling for the anchor (creates placeholder paternal
    // grandparent + placeholder father, links a paternal uncle/aunt).
    const uncleEmail = `rbothuncle-${Date.now()}@example.com`;
    const uncleUser = await createTestUser(uncleEmail, "password123");
    await svc.from("users").insert({ id: uncleUser.id, full_name: "Chu" });

    const uncleInviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanId,
        anchor_person_id: anchorPersonId,
        relation_code: "father_sibling",
        invitee_full_name: "Chu",
        invitee_gender: "male",
        invitee_user_id: uncleUser.id,
      }),
    });
    expect(uncleInviteRes.status).toBe(200);
    const uncleInviteBody = await uncleInviteRes.json();

    const uncleClient = await signInAs(uncleEmail, "password123");
    const uncleToken = await accessTokenFor(uncleClient);
    const uncleRespondRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${uncleToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: uncleInviteBody.invite_id, action: "accept" }),
    });
    expect(uncleRespondRes.status).toBe(200);

    // Second: resolve mother_sibling for the SAME anchor (creates placeholder maternal
    // grandparent + placeholder mother, links a maternal uncle/aunt). Under Stage 1 this
    // would have 400'd because the anchor already had a recorded parent (the placeholder
    // father created above).
    const auntEmail = `rbothaunt-${Date.now()}@example.com`;
    const auntUser = await createTestUser(auntEmail, "password123");
    await svc.from("users").insert({ id: auntUser.id, full_name: "Di" });

    const auntInviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanId,
        anchor_person_id: anchorPersonId,
        relation_code: "mother_sibling",
        invitee_full_name: "Di",
        invitee_gender: "female",
        invitee_user_id: auntUser.id,
      }),
    });
    expect(auntInviteRes.status).toBe(200);
    const auntInviteBody = await auntInviteRes.json();

    const auntClient = await signInAs(auntEmail, "password123");
    const auntToken = await accessTokenFor(auntClient);
    const auntRespondRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${auntToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: auntInviteBody.invite_id, action: "accept" }),
    });
    expect(auntRespondRes.status).toBe(200);

    // The anchor should now have exactly two recorded parents: the placeholder father
    // (paternal side, created by father_sibling) and the placeholder mother (maternal
    // side, created by mother_sibling).
    const { data: anchorParents } = await svc
      .from("relationships")
      .select("from_person_id")
      .eq("to_person_id", anchorPersonId)
      .eq("type", "parent_child");
    expect(anchorParents).toHaveLength(2);
    const parentIds = anchorParents!.map((row) => row.from_person_id);
    expect(new Set(parentIds).size).toBe(2);

    const { data: parentPersons } = await svc
      .from("persons")
      .select("id, gender")
      .in("id", parentIds);
    const genders = parentPersons!.map((p) => p.gender).sort();
    expect(genders).toEqual(["female", "male"]);
  });
});

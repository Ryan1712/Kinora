import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

async function setupClanAdminMemberAndTarget() {
  const svc = serviceClient();
  const adminEmail = `radm2-${Date.now()}-${Math.random()}@example.com`;
  const adminUser = await createTestUser(adminEmail, "password123");
  await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
  const { data: clan } = await svc
    .from("clans")
    .insert({ name: "Ho Review", branch_type: "noi", created_by: adminUser.id })
    .select()
    .single();
  const { data: adminPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
    .select()
    .single();

  const memberEmail = `rmem2-${Date.now()}@example.com`;
  const memberUser = await createTestUser(memberEmail, "password123");
  await svc.from("users").insert({ id: memberUser.id, full_name: "Member" });
  const { data: memberPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Member", generation_number: 17, linked_user_id: memberUser.id, role: "member" })
    .select()
    .single();

  const { data: grandchildPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Grandchild", generation_number: 18 })
    .select()
    .single();
  await svc.from("relationships").insert({
    clan_id: clan!.id, from_person_id: memberPerson!.id, to_person_id: grandchildPerson!.id, type: "parent_child",
  });

  return { svc, clan: clan!, adminEmail, adminPerson: adminPerson!, memberPerson: memberPerson!, grandchildPerson: grandchildPerson! };
}

describe("review-relationship-change function", () => {
  it("approve: sets new parent edge, updates generation, and cascades to descendants", async () => {
    const { svc, clan, adminEmail, adminPerson, memberPerson, grandchildPerson } = await setupClanAdminMemberAndTarget();

    const { data: req } = await svc
      .from("relationship_change_requests")
      .insert({
        clan_id: clan.id, person_id: memberPerson.id,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: adminPerson.id,
      })
      .select()
      .single();

    const adminClient = await signInAs(adminEmail, "password123");
    const token = await accessTokenFor(adminClient);
    const res = await fetch(functionUrl("review-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: req!.id, action: "approve" }),
    });
    expect(res.status).toBe(200);

    const { data: memberAfter } = await svc.from("persons").select("generation_number").eq("id", memberPerson.id).single();
    expect(memberAfter!.generation_number).toBe(16);

    const { data: grandchildAfter } = await svc.from("persons").select("generation_number").eq("id", grandchildPerson.id).single();
    expect(grandchildAfter!.generation_number).toBe(17);

    const { data: newEdge } = await svc
      .from("relationships")
      .select("*")
      .eq("from_person_id", adminPerson.id)
      .eq("to_person_id", memberPerson.id)
      .eq("type", "parent_child");
    expect(newEdge).toHaveLength(1);

    const { data: updatedReq } = await svc.from("relationship_change_requests").select("status").eq("id", req!.id).single();
    expect(updatedReq!.status).toBe("approved");
  });

  it("rejects approval when it would create a cycle", async () => {
    const { svc, clan, adminEmail, adminPerson, memberPerson, grandchildPerson } = await setupClanAdminMemberAndTarget();

    const { data: req } = await svc
      .from("relationship_change_requests")
      .insert({
        clan_id: clan.id, person_id: memberPerson.id,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: grandchildPerson.id,
      })
      .select()
      .single();

    const adminClient = await signInAs(adminEmail, "password123");
    const token = await accessTokenFor(adminClient);
    const res = await fetch(functionUrl("review-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: req!.id, action: "approve" }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects review from a non-admin/deputy caller", async () => {
    const { svc, clan, memberPerson, adminPerson } = await setupClanAdminMemberAndTarget();
    const { data: req } = await svc
      .from("relationship_change_requests")
      .insert({
        clan_id: clan.id, person_id: memberPerson.id,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: adminPerson.id,
      })
      .select()
      .single();

    const strangerEmail = `stranger2-${Date.now()}@example.com`;
    await createTestUser(strangerEmail, "password123");
    const client = await signInAs(strangerEmail, "password123");
    const token = await accessTokenFor(client);
    const res = await fetch(functionUrl("review-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: req!.id, action: "approve" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects spouse approval when person already has a recorded spouse", async () => {
    const { svc, clan, adminEmail, adminPerson, memberPerson } = await setupClanAdminMemberAndTarget();

    const { data: existingSpousePerson } = await svc
      .from("persons")
      .insert({ clan_id: clan.id, full_name: "Existing Spouse", generation_number: 17 })
      .select()
      .single();
    await svc.from("relationships").insert({
      clan_id: clan.id, from_person_id: memberPerson.id, to_person_id: existingSpousePerson!.id, type: "spouse",
    });

    const { data: newSpouseCandidate } = await svc
      .from("persons")
      .insert({ clan_id: clan.id, full_name: "New Spouse Candidate", generation_number: 17 })
      .select()
      .single();

    const { data: req } = await svc
      .from("relationship_change_requests")
      .insert({
        clan_id: clan.id, person_id: memberPerson.id,
        proposed_relationship_type: "spouse",
        proposed_relationship_with_person_id: newSpouseCandidate!.id,
      })
      .select()
      .single();

    const adminClient = await signInAs(adminEmail, "password123");
    const token = await accessTokenFor(adminClient);
    const res = await fetch(functionUrl("review-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: req!.id, action: "approve" }),
    });
    expect(res.status).toBe(409);

    const { data: newEdge } = await svc
      .from("relationships")
      .select("*")
      .eq("type", "spouse")
      .or(`from_person_id.eq.${newSpouseCandidate!.id},to_person_id.eq.${newSpouseCandidate!.id}`);
    expect(newEdge).toHaveLength(0);

    const { data: updatedReq } = await svc.from("relationship_change_requests").select("status").eq("id", req!.id).single();
    expect(updatedReq!.status).toBe("pending");
  });
});

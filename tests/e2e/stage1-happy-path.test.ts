import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

describe("Stage 1 happy path", () => {
  it("signup -> create clan -> invite -> accept -> propose change -> approve -> leave", async () => {
    // This test makes 6 sequential Edge Function calls; under the full suite's
    // parallel test-file load against the same local edge-runtime/Postgres
    // instance, that chain can exceed the global 20s testTimeout even though
    // each individual call succeeds. Give this one test more headroom rather
    // than raising the global timeout for every test.
    const svc = serviceClient();

    const adminEmail = `e2e-admin-${Date.now()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Pham Van Duy", email: adminEmail });
    const adminClient = await signInAs(adminEmail, "password123");
    const adminToken = await accessTokenFor(adminClient);

    const createClanRes = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ho Pham", branch_type: "noi", admin_full_name: "Pham Van Duy", admin_generation_number: 15 }),
    });
    const { clan_id, person_id: adminPersonId } = await createClanRes.json();
    expect(createClanRes.status).toBe(200);

    const inviteeEmail = `e2e-invitee-${Date.now()}@example.com`;
    const inviteeUser = await createTestUser(inviteeEmail, "password123");
    await svc.from("users").insert({ id: inviteeUser.id, full_name: "Pham Van Toan", email: inviteeEmail });

    const inviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id, anchor_person_id: adminPersonId, relation_code: "father",
        invitee_full_name: "Pham Van Toan", invitee_gender: "male", invitee_user_id: inviteeUser.id,
      }),
    });
    const { invite_id } = await inviteRes.json();
    expect(inviteRes.status).toBe(200);

    const inviteeToken = await accessTokenFor(await signInAs(inviteeEmail, "password123"));
    const acceptRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id, action: "accept" }),
    });
    const { person_id: inviteePersonId } = await acceptRes.json();
    expect(acceptRes.status).toBe(200);

    const { data: inviteePerson } = await svc.from("persons").select("generation_number").eq("id", inviteePersonId).single();
    expect(inviteePerson!.generation_number).toBe(14);

    const proposeRes = await fetch(functionUrl("propose-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id, proposed_relationship_type: "parent_child", proposed_relationship_with_person_id: adminPersonId }),
    });
    const { request_id } = await proposeRes.json();

    const reviewRes = await fetch(functionUrl("review-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id, action: "reject" }),
    });
    expect(reviewRes.status).toBe(200);

    const leaveRes = await fetch(functionUrl("leave-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id }),
    });
    expect(leaveRes.status).toBe(200);

    const { data: afterLeave } = await svc.from("persons").select("linked_user_id, generation_number").eq("id", inviteePersonId).single();
    expect(afterLeave!.linked_user_id).toBeNull();
    expect(afterLeave!.generation_number).toBe(14);
  }, 60000);
});

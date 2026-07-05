import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

async function setupClanWithAdmin() {
  const svc = serviceClient();
  const email = `iadmin-${Date.now()}-${Math.random()}@example.com`;
  const user = await createTestUser(email, "password123");
  await svc.from("users").insert({ id: user.id, full_name: "Admin" });
  const { data: clan } = await svc
    .from("clans")
    .insert({ name: "Ho Invite Fn", branch_type: "noi", created_by: user.id })
    .select()
    .single();
  const { data: person } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: user.id, role: "admin", gender: "male" })
    .select()
    .single();
  return { svc, email, clan: clan!, adminPerson: person! };
}

describe("invite-member function", () => {
  it("creates a direct invite (father) with proposed_relationship_with_person_id = anchor", async () => {
    const { email, clan, adminPerson } = await setupClanWithAdmin();
    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan.id,
        anchor_person_id: adminPerson.id,
        relation_code: "father",
        invitee_full_name: "Pham Van Toan",
        invitee_gender: "male",
        invitee_phone_or_email: "toan@example.com",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const { data: invite } = await serviceClient()
      .from("invites")
      .select("*")
      .eq("id", body.invite_id)
      .single();
    expect(invite!.proposed_relationship_type).toBe("parent_child");
    expect(invite!.proposed_relationship_with_person_id).toBe(adminPerson.id);
  });

  it("creates a placeholder grandparent+father chain for father_sibling and points the invite at the grandparent", async () => {
    const { email, clan, adminPerson } = await setupClanWithAdmin();
    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan.id,
        anchor_person_id: adminPerson.id,
        relation_code: "father_sibling",
        invitee_full_name: "Bac Ba",
        invitee_gender: "male",
        invitee_phone_or_email: "bacba@example.com",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const svc = serviceClient();
    const { data: invite } = await svc.from("invites").select("*").eq("id", body.invite_id).single();
    const grandparentId = invite!.proposed_relationship_with_person_id;

    const { data: grandparentToFather } = await svc
      .from("relationships")
      .select("*")
      .eq("from_person_id", grandparentId)
      .eq("to_person_id", (await svc.from("relationships").select("from_person_id").eq("to_person_id", adminPerson.id).single()).data!.from_person_id);
    expect(grandparentToFather!.length).toBe(1);

    const { data: grandparentPerson } = await svc.from("persons").select("generation_number").eq("id", grandparentId).single();
    expect(grandparentPerson!.generation_number).toBe(13);
  });

  it("rejects invite when invite_permission is admin_only and caller is a plain member", async () => {
    const svc = serviceClient();
    const { email: adminEmail, clan } = await setupClanWithAdmin();
    const memberEmail = `imem-${Date.now()}@example.com`;
    const memberUser = await createTestUser(memberEmail, "password123");
    await svc.from("users").insert({ id: memberUser.id, full_name: "Member" });
    const { data: memberPerson } = await svc
      .from("persons")
      .insert({ clan_id: clan.id, full_name: "Member", generation_number: 16, linked_user_id: memberUser.id, role: "member" })
      .select()
      .single();

    const memberClient = await signInAs(memberEmail, "password123");
    const token = await accessTokenFor(memberClient);
    const res = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan.id,
        anchor_person_id: memberPerson!.id,
        relation_code: "son",
        invitee_full_name: "Con",
        invitee_phone_or_email: "con@example.com",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects an anchor_person_id belonging to a different clan", async () => {
    const { email, clan } = await setupClanWithAdmin();
    const other = await setupClanWithAdmin();

    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);
    const res = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan.id,
        anchor_person_id: other.adminPerson.id,
        relation_code: "son",
        invitee_full_name: "Con",
        invitee_phone_or_email: "con-crossclan@example.com",
      }),
    });
    expect(res.status).toBe(404);
  });
});

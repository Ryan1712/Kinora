import { describe, it, expect, beforeAll } from "vitest";
import { serviceClient, createTestUser, signInAs } from "../helpers/client";

const admin = serviceClient();
let clanId: string, memberPersonId: string, anchorPersonId: string;
let memberEmail: string, adminEmail: string;

beforeAll(async () => {
  adminEmail = `radm-${Date.now()}@example.com`;
  const adminUser = await createTestUser(adminEmail, "password123");
  await admin.from("users").insert({ id: adminUser.id, full_name: "Admin" });
  const { data: clan } = await admin
    .from("clans")
    .insert({ name: "Ho RCR", branch_type: "noi", created_by: adminUser.id })
    .select()
    .single();
  clanId = clan!.id;
  const { data: adminPerson } = await admin
    .from("persons")
    .insert({ clan_id: clanId, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
    .select()
    .single();
  anchorPersonId = adminPerson!.id;

  memberEmail = `rmem-${Date.now()}@example.com`;
  const memberUser = await createTestUser(memberEmail, "password123");
  await admin.from("users").insert({ id: memberUser.id, full_name: "Member" });
  const { data: memberPerson } = await admin
    .from("persons")
    .insert({ clan_id: clanId, full_name: "Member", generation_number: 16, linked_user_id: memberUser.id, role: "member" })
    .select()
    .single();
  memberPersonId = memberPerson!.id;
});

describe("relationship_change_requests table", () => {
  it("is visible to the requester and to clan admin/deputy, invisible to unrelated members", async () => {
    const { data: req, error } = await admin
      .from("relationship_change_requests")
      .insert({
        clan_id: clanId,
        person_id: memberPersonId,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: anchorPersonId,
      })
      .select()
      .single();
    expect(error).toBeNull();

    const memberClient = await signInAs(memberEmail, "password123");
    const { data: seenBySelf } = await memberClient
      .from("relationship_change_requests")
      .select("id")
      .eq("id", req!.id);
    expect(seenBySelf).toHaveLength(1);

    const adminClient = await signInAs(adminEmail, "password123");
    const { data: seenByAdmin } = await adminClient
      .from("relationship_change_requests")
      .select("id")
      .eq("id", req!.id);
    expect(seenByAdmin).toHaveLength(1);
  });
});

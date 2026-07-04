import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

async function setupClan() {
  const svc = serviceClient();
  const adminEmail = `sadm-${Date.now()}-${Math.random()}@example.com`;
  const adminUser = await createTestUser(adminEmail, "password123");
  await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
  const { data: clan } = await svc
    .from("clans")
    .insert({ name: "Ho Settings", branch_type: "noi", created_by: adminUser.id })
    .select()
    .single();
  const { data: adminPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
    .select()
    .single();

  const memberEmail = `smem-${Date.now()}@example.com`;
  const memberUser = await createTestUser(memberEmail, "password123");
  await svc.from("users").insert({ id: memberUser.id, full_name: "Member" });
  const { data: memberPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Member", generation_number: 16, linked_user_id: memberUser.id, role: "member" })
    .select()
    .single();

  return { svc, clan: clan!, adminEmail, adminPerson: adminPerson!, memberEmail, memberPerson: memberPerson! };
}

describe("clan-admin-settings function", () => {
  it("update_settings changes invite_permission", async () => {
    const { clan, adminEmail } = await setupClan();
    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));
    const res = await fetch(functionUrl("clan-admin-settings"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, action: "update_settings", invite_permission: "all_members" }),
    });
    expect(res.status).toBe(200);
    const { data: updated } = await serviceClient().from("clans").select("invite_permission").eq("id", clan.id).single();
    expect(updated!.invite_permission).toBe("all_members");
  });

  it("appoint_deputy then remove_deputy toggles role", async () => {
    const { svc, clan, adminEmail, memberPerson } = await setupClan();
    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));

    const appointRes = await fetch(functionUrl("clan-admin-settings"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, action: "appoint_deputy", person_id: memberPerson.id }),
    });
    expect(appointRes.status).toBe(200);
    const { data: afterAppoint } = await svc.from("persons").select("role").eq("id", memberPerson.id).single();
    expect(afterAppoint!.role).toBe("deputy");

    const removeRes = await fetch(functionUrl("clan-admin-settings"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, action: "remove_deputy", person_id: memberPerson.id }),
    });
    expect(removeRes.status).toBe(200);
    const { data: afterRemove } = await svc.from("persons").select("role").eq("id", memberPerson.id).single();
    expect(afterRemove!.role).toBe("member");
  });

  it("remove_member unlinks the account but keeps the person row", async () => {
    const { svc, clan, adminEmail, memberPerson } = await setupClan();
    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));
    const res = await fetch(functionUrl("clan-admin-settings"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, action: "remove_member", person_id: memberPerson.id }),
    });
    expect(res.status).toBe(200);
    const { data: after } = await svc.from("persons").select("linked_user_id, role").eq("id", memberPerson.id).single();
    expect(after!.linked_user_id).toBeNull();
    expect(after!.role).toBeNull();
  });

  it("rejects a non-admin caller for update_settings", async () => {
    const { clan, memberEmail } = await setupClan();
    const token = await accessTokenFor(await signInAs(memberEmail, "password123"));
    const res = await fetch(functionUrl("clan-admin-settings"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, action: "update_settings", name: "Hacked" }),
    });
    expect(res.status).toBe(403);
  });
});

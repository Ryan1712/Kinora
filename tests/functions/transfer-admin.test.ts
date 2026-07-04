import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

async function setupClan() {
  const svc = serviceClient();
  const adminEmail = `tadm-${Date.now()}-${Math.random()}@example.com`;
  const adminUser = await createTestUser(adminEmail, "password123");
  await svc.from("users").insert({ id: adminUser.id, full_name: "Admin", email: adminEmail });
  const { data: clan } = await svc
    .from("clans")
    .insert({ name: "Ho Transfer", branch_type: "noi", created_by: adminUser.id })
    .select()
    .single();
  const { data: adminPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
    .select()
    .single();

  const memberEmail = `tmem-${Date.now()}@example.com`;
  const memberUser = await createTestUser(memberEmail, "password123");
  await svc.from("users").insert({ id: memberUser.id, full_name: "Member", email: memberEmail });
  const { data: memberPerson } = await svc
    .from("persons")
    .insert({ clan_id: clan!.id, full_name: "Member", generation_number: 16, linked_user_id: memberUser.id, role: "member" })
    .select()
    .single();

  return { svc, clan: clan!, adminEmail, adminPerson: adminPerson!, memberPerson: memberPerson! };
}

describe("transfer-admin function", () => {
  it("transfers admin role after correct password confirmation", async () => {
    const { svc, clan, adminEmail, adminPerson, memberPerson } = await setupClan();
    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));
    const res = await fetch(functionUrl("transfer-admin"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, new_admin_person_id: memberPerson.id, password: "password123" }),
    });
    expect(res.status).toBe(200);

    const { data: oldAdmin } = await svc.from("persons").select("role").eq("id", adminPerson.id).single();
    expect(oldAdmin!.role).toBe("member");
    const { data: newAdmin } = await svc.from("persons").select("role").eq("id", memberPerson.id).single();
    expect(newAdmin!.role).toBe("admin");
  });

  it("rejects an incorrect password", async () => {
    const { clan, adminEmail, memberPerson } = await setupClan();
    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));
    const res = await fetch(functionUrl("transfer-admin"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan.id, new_admin_person_id: memberPerson.id, password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
  });
});

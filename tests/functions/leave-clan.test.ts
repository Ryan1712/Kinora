import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

describe("leave-clan function", () => {
  it("allows a plain member to leave, unlinking their person", async () => {
    const svc = serviceClient();
    const adminEmail = `ladm-${Date.now()}-${Math.random()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const { data: clan } = await svc
      .from("clans")
      .insert({ name: "Ho Leave", branch_type: "noi", created_by: adminUser.id })
      .select()
      .single();
    await svc.from("persons").insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" });

    const memberEmail = `lmem-${Date.now()}@example.com`;
    const memberUser = await createTestUser(memberEmail, "password123");
    await svc.from("users").insert({ id: memberUser.id, full_name: "Member" });
    const { data: memberPerson } = await svc
      .from("persons")
      .insert({ clan_id: clan!.id, full_name: "Member", generation_number: 16, linked_user_id: memberUser.id, role: "member" })
      .select()
      .single();

    const token = await accessTokenFor(await signInAs(memberEmail, "password123"));
    const res = await fetch(functionUrl("leave-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan!.id }),
    });
    expect(res.status).toBe(200);

    const { data: after } = await svc.from("persons").select("linked_user_id, role").eq("id", memberPerson!.id).single();
    expect(after!.linked_user_id).toBeNull();
    expect(after!.role).toBeNull();
  });

  it("blocks the sole admin from leaving", async () => {
    const svc = serviceClient();
    const adminEmail = `ladm2-${Date.now()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const { data: clan } = await svc
      .from("clans")
      .insert({ name: "Ho Leave 2", branch_type: "noi", created_by: adminUser.id })
      .select()
      .single();
    await svc.from("persons").insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" });

    const token = await accessTokenFor(await signInAs(adminEmail, "password123"));
    const res = await fetch(functionUrl("leave-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clan!.id }),
    });
    expect(res.status).toBe(409);
  });
});

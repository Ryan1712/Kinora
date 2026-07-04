import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

describe("propose-relationship-change function", () => {
  it("creates a pending request for the caller's own person", async () => {
    const svc = serviceClient();
    const adminEmail = `padm-${Date.now()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const { data: clan } = await svc
      .from("clans")
      .insert({ name: "Ho Propose", branch_type: "noi", created_by: adminUser.id })
      .select()
      .single();
    const { data: adminPerson } = await svc
      .from("persons")
      .insert({ clan_id: clan!.id, full_name: "Admin", generation_number: 15, linked_user_id: adminUser.id, role: "admin" })
      .select()
      .single();

    const memberEmail = `pmem-${Date.now()}@example.com`;
    const memberUser = await createTestUser(memberEmail, "password123");
    await svc.from("users").insert({ id: memberUser.id, full_name: "Member" });
    await svc.from("persons").insert({
      clan_id: clan!.id, full_name: "Member", generation_number: 16,
      linked_user_id: memberUser.id, role: "member",
    });

    const client = await signInAs(memberEmail, "password123");
    const token = await accessTokenFor(client);
    const res = await fetch(functionUrl("propose-relationship-change"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan!.id,
        proposed_relationship_type: "parent_child",
        proposed_relationship_with_person_id: adminPerson!.id,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const { data: request } = await svc
      .from("relationship_change_requests")
      .select("*")
      .eq("id", body.request_id)
      .single();
    expect(request!.status).toBe("pending");
  });
});

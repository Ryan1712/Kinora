import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

describe("create-clan function", () => {
  it("creates a clan and an admin person for the caller", async () => {
    const email = `createclan-${Date.now()}@example.com`;
    const user = await createTestUser(email, "password123");
    await serviceClient().from("users").insert({ id: user.id, full_name: "Pham Van Duy" });
    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ho Pham",
        branch_type: "noi",
        admin_full_name: "Pham Van Duy",
        admin_generation_number: 15,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clan_id).toBeTruthy();
    expect(body.person_id).toBeTruthy();

    const { data: person } = await serviceClient()
      .from("persons")
      .select("role, generation_number, linked_user_id")
      .eq("id", body.person_id)
      .single();
    expect(person!.role).toBe("admin");
    expect(person!.generation_number).toBe(15);
    expect(person!.linked_user_id).toBe(user.id);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", branch_type: "noi", admin_full_name: "X", admin_generation_number: 1 }),
    });
    expect(res.status).toBe(401);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { serviceClient } from "../helpers/client";

const admin = serviceClient();
let clanId: string;
let grandparent: string, parent: string, child: string, grandchild: string;

async function makePerson(generation: number, name: string) {
  const { data } = await admin
    .from("persons")
    .insert({ clan_id: clanId, full_name: name, generation_number: generation })
    .select()
    .single();
  return data!.id as string;
}

beforeAll(async () => {
  const { data: user } = await admin.auth.admin.createUser({
    email: `rel-${Date.now()}@example.com`,
    password: "password123",
    email_confirm: true,
  });
  await admin.from("users").insert({ id: user.user!.id, full_name: "Owner" });
  const { data: clan } = await admin
    .from("clans")
    .insert({ name: "Ho Rel", branch_type: "noi", created_by: user.user!.id })
    .select()
    .single();
  clanId = clan!.id;
  grandparent = await makePerson(13, "Grandparent");
  parent = await makePerson(14, "Parent");
  child = await makePerson(15, "Child");
  grandchild = await makePerson(16, "Grandchild");

  await admin.from("relationships").insert([
    { clan_id: clanId, from_person_id: grandparent, to_person_id: parent, type: "parent_child" },
    { clan_id: clanId, from_person_id: parent, to_person_id: child, type: "parent_child" },
    { clan_id: clanId, from_person_id: child, to_person_id: grandchild, type: "parent_child" },
  ]);
});

describe("relationships graph functions", () => {
  it("detects a cycle when the proposed parent is already a descendant", async () => {
    const { data: cyclic } = await admin.rpc("would_create_cycle", {
      p_parent_id: grandchild,
      p_child_id: grandparent,
    });
    expect(cyclic).toBe(true);

    const { data: fine } = await admin.rpc("would_create_cycle", {
      p_parent_id: grandparent,
      p_child_id: grandchild,
    });
    expect(fine).toBe(false);
  });

  it("shifts generation_number for every descendant when an ancestor's generation changes", async () => {
    await admin.rpc("shift_descendant_generations", {
      p_person_id: parent,
      p_delta: 2,
    });
    const { data: rows } = await admin
      .from("persons")
      .select("id, generation_number")
      .in("id", [grandparent, parent, child, grandchild]);
    const byId = Object.fromEntries(rows!.map((r) => [r.id, r.generation_number]));
    expect(byId[grandparent]).toBe(13);
    expect(byId[parent]).toBe(14);
    expect(byId[child]).toBe(17);
    expect(byId[grandchild]).toBe(18);
  });
});

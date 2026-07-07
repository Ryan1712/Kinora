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

  it("allows one father and one mother but rejects extra or duplicate-gender parents", async () => {
    const father = await makePerson(20, "Father");
    const mother = await makePerson(20, "Mother");
    const secondFather = await makePerson(20, "Second Father");
    const childWithTwoParents = await makePerson(21, "Child With Two Parents");

    await admin.from("persons").update({ gender: "male" }).eq("id", father);
    await admin.from("persons").update({ gender: "female" }).eq("id", mother);
    await admin.from("persons").update({ gender: "male" }).eq("id", secondFather);

    const { error: fatherErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: father,
      to_person_id: childWithTwoParents,
      type: "parent_child",
    });
    expect(fatherErr).toBeNull();

    const { error: motherErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: mother,
      to_person_id: childWithTwoParents,
      type: "parent_child",
    });
    expect(motherErr).toBeNull();

    const { error: thirdParentErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: secondFather,
      to_person_id: childWithTwoParents,
      type: "parent_child",
    });
    expect(thirdParentErr).not.toBeNull();

    const childWithFather = await makePerson(21, "Child With Father");
    await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: father,
      to_person_id: childWithFather,
      type: "parent_child",
    });

    const { error: duplicateGenderErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: secondFather,
      to_person_id: childWithFather,
      type: "parent_child",
    });
    expect(duplicateGenderErr).not.toBeNull();

    const secondMother = await makePerson(20, "Second Mother");
    await admin.from("persons").update({ gender: "female" }).eq("id", secondMother);

    const childWithMother = await makePerson(21, "Child With Mother");
    await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: mother,
      to_person_id: childWithMother,
      type: "parent_child",
    });

    const { error: duplicateMotherErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: secondMother,
      to_person_id: childWithMother,
      type: "parent_child",
    });
    expect(duplicateMotherErr).not.toBeNull();
  });

  it("never blocks unknown-gender parents on the duplicate-gender rule, but still enforces the max-2 cap", async () => {
    const firstUnknownParent = await makePerson(20, "Unknown Parent One");
    const secondUnknownParent = await makePerson(20, "Unknown Parent Two");
    const thirdParent = await makePerson(20, "Third Parent");
    const childWithUnknownParents = await makePerson(21, "Child With Unknown Parents");

    // firstUnknownParent and secondUnknownParent are left at the default gender ("unknown").

    const { error: firstErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: firstUnknownParent,
      to_person_id: childWithUnknownParents,
      type: "parent_child",
    });
    expect(firstErr).toBeNull();

    const { error: secondErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: secondUnknownParent,
      to_person_id: childWithUnknownParents,
      type: "parent_child",
    });
    expect(secondErr).toBeNull();

    const { error: thirdErr } = await admin.from("relationships").insert({
      clan_id: clanId,
      from_person_id: thirdParent,
      to_person_id: childWithUnknownParents,
      type: "parent_child",
    });
    expect(thirdErr).not.toBeNull();
  });
});

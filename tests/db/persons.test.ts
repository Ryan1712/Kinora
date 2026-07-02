import { describe, it, expect } from "vitest";
import { serviceClient, createTestUser, signInAs } from "../helpers/client";

async function makeClanWithAdmin(clanName: string) {
  const admin = serviceClient();
  const email = `admin-${Date.now()}-${Math.random()}@example.com`;
  const user = await createTestUser(email, "password123");
  await admin.from("users").insert({ id: user.id, full_name: "Admin" });
  const { data: clan } = await admin
    .from("clans")
    .insert({ name: clanName, branch_type: "noi", created_by: user.id })
    .select()
    .single();
  const { data: person } = await admin
    .from("persons")
    .insert({
      clan_id: clan!.id,
      full_name: "Admin",
      generation_number: 15,
      linked_user_id: user.id,
      role: "admin",
    })
    .select()
    .single();
  return { admin, user, email, clan, person };
}

describe("persons table + membership visibility", () => {
  it("lets clan members see their own clan/persons and blocks outsiders", async () => {
    const a = await makeClanWithAdmin("Ho A");
    const b = await makeClanWithAdmin("Ho B");

    const clientA = await signInAs(a.email, "password123");

    const { data: ownClan } = await clientA
      .from("clans")
      .select("id")
      .eq("id", a.clan!.id);
    expect(ownClan).toHaveLength(1);

    const { data: otherClan } = await clientA
      .from("clans")
      .select("id")
      .eq("id", b.clan!.id);
    expect(otherClan).toEqual([]);

    const { data: ownPersons } = await clientA
      .from("persons")
      .select("id")
      .eq("clan_id", a.clan!.id);
    expect(ownPersons).toHaveLength(1);

    const { data: otherPersons } = await clientA
      .from("persons")
      .select("id")
      .eq("clan_id", b.clan!.id);
    expect(otherPersons).toEqual([]);
  });

  it("denies direct client writes to persons (service_role only)", async () => {
    const a = await makeClanWithAdmin("Ho C");
    const clientA = await signInAs(a.email, "password123");
    const { error } = await clientA.from("persons").insert({
      clan_id: a.clan!.id,
      full_name: "Intruder",
      generation_number: 16,
    });
    expect(error).not.toBeNull();
  });
});

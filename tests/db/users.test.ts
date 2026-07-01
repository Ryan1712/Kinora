import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, serviceClient } from "../helpers/client";

describe("users table", () => {
  it("auto-generates a unique invite_code on insert and allows self-select/update, denies cross-user update", async () => {
    const email = `user-${Date.now()}@example.com`;
    const user = await createTestUser(email, "password123");
    const client = await signInAs(email, "password123");

    const { error: insertErr } = await client
      .from("users")
      .insert({ id: user.id, full_name: "Nguyen Van A" });
    expect(insertErr).toBeNull();

    const { data: row, error: selectErr } = await client
      .from("users")
      .select("invite_code, full_name")
      .eq("id", user.id)
      .single();
    expect(selectErr).toBeNull();
    expect(row!.invite_code).toBeTruthy();

    const { error: updateErr } = await client
      .from("users")
      .update({ occupation: "Ky su" })
      .eq("id", user.id);
    expect(updateErr).toBeNull();

    const otherEmail = `user-${Date.now()}-2@example.com`;
    const other = await createTestUser(otherEmail, "password123");
    const otherClient = await signInAs(otherEmail, "password123");
    await otherClient.from("users").insert({ id: other.id, full_name: "Nguyen Van B" });

    const { data: crossRead } = await otherClient
      .from("users")
      .select("id")
      .eq("id", user.id);
    expect(crossRead).toEqual([]);

    const { error: crossUpdateErr } = await otherClient
      .from("users")
      .update({ occupation: "Hack" })
      .eq("id", user.id);
    const { data: unchanged } = await serviceClient()
      .from("users")
      .select("occupation")
      .eq("id", user.id)
      .single();
    expect(crossUpdateErr).toBeNull();
    expect(unchanged!.occupation).toBe("Ky su");
  });
});

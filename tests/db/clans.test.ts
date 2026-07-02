import { describe, it, expect } from "vitest";
import { serviceClient } from "../helpers/client";

describe("clans table", () => {
  it("enforces branch_type and invite_permission check constraints", async () => {
    const admin = serviceClient();
    const { data: user } = await admin.auth.admin.createUser({
      email: `clanowner-${Date.now()}@example.com`,
      password: "password123",
      email_confirm: true,
    });
    await admin.from("users").insert({ id: user.user!.id, full_name: "Owner" });

    const { error: badBranch } = await admin
      .from("clans")
      .insert({ name: "Ho Pham", branch_type: "invalid", created_by: user.user!.id });
    expect(badBranch).not.toBeNull();

    const { data: ok, error: okErr } = await admin
      .from("clans")
      .insert({ name: "Ho Pham", branch_type: "noi", created_by: user.user!.id })
      .select()
      .single();
    expect(okErr).toBeNull();
    expect(ok!.invite_permission).toBe("admin_only");
  });
});

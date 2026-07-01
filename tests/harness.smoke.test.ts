import { describe, it, expect } from "vitest";
import { createTestUser, signInAs } from "./helpers/client";

describe("test harness", () => {
  it("creates a user and signs in", async () => {
    const email = `harness-${Date.now()}@example.com`;
    await createTestUser(email, "password123");
    const client = await signInAs(email, "password123");
    const { data } = await client.auth.getUser();
    expect(data.user?.email).toBe(email);
  });
});

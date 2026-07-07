# Stage 2b Kinship Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute the Vietnamese kinship term a viewer ("ego") uses to address any other member ("target") within the same clan, and thread a `dob` (date of birth) field through the two places a person's birth date can be set, since the algorithm needs it to resolve age-dependent terms.

**Architecture:** A single Postgres function `get_kinship_terms(p_clan_id, p_ego_person_id)` computes terms for every other clan member in one call, using the same DB-first philosophy as Stage 1's `would_create_cycle`/`shift_descendant_generations`. A new Edge Function `update-my-person-info` lets a user set their own `persons.dob` (client cannot write `persons` directly — RLS/grants restrict writes to `service_role`, same rule Stage 1 established for every other `persons` write). `invite-member` gains an optional `invitee_dob` field, required by the client only for same-generation relation codes. A new React Query hook `useKinshipTerms` wraps the RPC call, following the existing `useClanMembers` pattern. **This plan does not wire the computed terms into any screen's rendering** — that is Stage 2c, a separate plan.

**Tech Stack:** Same as Stage 1/2a — Supabase Postgres (plpgsql function), Deno Edge Functions, `@tanstack/react-query` hooks, Jest (app-level) + Vitest (backend-level), no new dependencies.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-07-stage2b-kinship-terms-design.md`.
- Scope of relations covered: cha/mẹ, ông bà (nội/ngoại), con/cháu, anh/chị/em (ruột và họ), cô/dì/chú/bác/cậu, vợ/chồng. Anything else (further generations, in-laws) returns `term = null` — do not attempt to handle it.
- Kinship term convention (Northern Vietnamese, as approved): father's older brother = `bác`, father's younger brother = `chú`, father's sister (any age) = `cô`; mother's brother (any age) = `cậu`, mother's sister (any age) = `dì`. Do not deviate from this table.
- `persons` cannot be written directly by an authenticated client — every write goes through a `service_role` Edge Function (established in Stage 1, unchanged). `get_kinship_terms` is a **read-only** function and is the one exception allowed to be called directly by `authenticated` clients (via `grant execute`), since it does not write anything and RLS already scopes `persons`/`relationships` reads to the caller's own clans.
- No screen's rendering changes in this plan — `invite.tsx` and `profile.tsx` gain new input fields and new required-field validation, but no other existing behavior (props, navigation, other field validation) may change. Every existing test file must keep passing unmodified unless this plan's own task explicitly says to change it.
- Follow each file's existing import style (`@/` alias vs relative `../../../../`) exactly as established in Wave 1/Wave 2 of the visual refresh plans.

---

## Task 1: Thread `invitee_dob` through invite-member and respond-invite

**Files:**
- Create: `supabase/migrations/20260707130000_add_invitee_dob_to_invites.sql`
- Modify: `supabase/functions/invite-member/index.ts`
- Modify: `supabase/functions/respond-invite/index.ts`
- Modify: `app/src/api/types.ts`
- Test: `tests/functions/invite-member.test.ts`
- Test: `tests/functions/respond-invite.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `invites.invitee_dob` (nullable `date` column). `InviteMemberParams` gains an optional `invitee_dob?: string` field (ISO date string, e.g. `'1990-05-12'`). On accept, `respond-invite` copies `invite.invitee_dob` into the newly-created `persons.dob`.

- [ ] **Step 1: Write the failing migration test**

Read `tests/db/relationships.test.ts` first to confirm the exact helper functions available (`serviceClient()`, etc. — this test file uses a different helper set than `tests/functions/*.test.ts`, which use `tests/helpers/client.ts`'s `createTestUser`/`signInAs`/`accessTokenFor`/`functionUrl`/`serviceClient`).

Add this test to `tests/functions/invite-member.test.ts` (append inside the existing `describe("invite-member function", ...)` block, after the last existing test):
```ts
  it("stores invitee_dob on the invite row when provided", async () => {
    const { email, clan, adminPerson } = await setupClanWithAdmin();
    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clan.id,
        anchor_person_id: adminPerson.id,
        relation_code: "sibling",
        invitee_full_name: "Pham Van Em",
        invitee_gender: "male",
        invitee_phone_or_email: "em@example.com",
        invitee_dob: "1995-03-10",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const { data: invite } = await serviceClient()
      .from("invites")
      .select("invitee_dob")
      .eq("id", body.invite_id)
      .single();
    expect(invite!.invitee_dob).toBe("1995-03-10");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root, Docker/Supabase must be running): `npx vitest run tests/functions/invite-member.test.ts`
Expected: FAIL — `invitee_dob` column doesn't exist yet, or the returned value is `undefined`/`null` because `invite-member` doesn't store it yet.

- [ ] **Step 3: Add the migration**

Create `supabase/migrations/20260707130000_add_invitee_dob_to_invites.sql`:
```sql
alter table public.invites
  add column invitee_dob date;
```

Apply it: `npx supabase db reset` (adding a new migration file does not auto-apply to an already-running local DB — this project has hit this exact gotcha twice already; always reset after adding a migration).

- [ ] **Step 4: Store `invitee_dob` in invite-member**

In `supabase/functions/invite-member/index.ts`, add `invitee_dob` to the destructured body (line with `const { clan_id, anchor_person_id, ... } = body;`) and to the `invites` insert. Replace the full contents of `supabase/functions/invite-member/index.ts`:
```ts
import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";
import { resolveDirectTarget, RelationCode } from "../_shared/relations.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json();
  const {
    clan_id, anchor_person_id, relation_code,
    invitee_full_name, invitee_gender, invitee_dob, invitee_user_id, invitee_phone_or_email,
  } = body;

  if (!clan_id || !anchor_person_id || !relation_code || !invitee_full_name) {
    return jsonResponse({ error: "missing required fields" }, 400);
  }
  if (!invitee_user_id && !invitee_phone_or_email) {
    return jsonResponse({ error: "invitee_user_id or invitee_phone_or_email is required" }, 400);
  }

  const svc = getServiceClient();

  const { data: clan } = await svc.from("clans").select("invite_permission").eq("id", clan_id).single();
  if (!clan) return jsonResponse({ error: "clan not found" }, 404);

  const { data: callerPerson } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!callerPerson) return jsonResponse({ error: "not a member of this clan" }, 403);

  const canInvite = clan.invite_permission === "all_members" || ["admin", "deputy"].includes(callerPerson.role);
  if (!canInvite) return jsonResponse({ error: "not permitted to invite in this clan" }, 403);

  const { data: anchorPerson } = await svc
    .from("persons")
    .select("id")
    .eq("id", anchor_person_id)
    .eq("clan_id", clan_id)
    .maybeSingle();
  if (!anchorPerson) return jsonResponse({ error: "anchor person not found in this clan" }, 404);

  let target;
  try {
    target = await resolveDirectTarget(svc, clan_id, anchor_person_id, relation_code as RelationCode);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 400);
  }

  const { data: invite, error: inviteErr } = await svc
    .from("invites")
    .insert({
      clan_id,
      invited_by_person_id: callerPerson.id,
      invitee_user_id: invitee_user_id ?? null,
      invitee_phone_or_email: invitee_phone_or_email ?? null,
      invitee_full_name,
      invitee_gender: invitee_gender ?? "unknown",
      invitee_dob: invitee_dob ?? null,
      proposed_relationship_type: target.type,
      proposed_relationship_with_person_id: target.counterpartPersonId,
      resolved_generation: target.newPersonGeneration,
    })
    .select()
    .single();
  if (inviteErr) return jsonResponse({ error: inviteErr.message }, 500);

  return jsonResponse({ invite_id: invite.id, resolved_generation: target.newPersonGeneration });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/functions/invite-member.test.ts`
Expected: PASS (all tests including the new one).

- [ ] **Step 6: Write the failing respond-invite test**

Add this test to `tests/functions/respond-invite.test.ts` (append inside the existing `describe("respond-invite function", ...)` block):
```ts
  it("accept: copies invitee_dob onto the new person's dob", async () => {
    const svc = serviceClient();
    const adminEmail = `rdobadm-${Date.now()}-${Math.random()}@example.com`;
    const adminUser = await createTestUser(adminEmail, "password123");
    await svc.from("users").insert({ id: adminUser.id, full_name: "Admin" });
    const adminClient = await signInAs(adminEmail, "password123");
    const adminToken = await accessTokenFor(adminClient);

    const clanRes = await fetch(functionUrl("create-clan"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ho Dob Copy",
        branch_type: "noi",
        admin_full_name: "Admin",
        admin_generation_number: 15,
      }),
    });
    const clanBody = await clanRes.json();

    const inviteeEmail = `rdobinv-${Date.now()}@example.com`;
    const inviteeUser = await createTestUser(inviteeEmail, "password123");
    await svc.from("users").insert({ id: inviteeUser.id, full_name: "Em" });

    const inviteRes = await fetch(functionUrl("invite-member"), {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanBody.clan_id,
        anchor_person_id: clanBody.person_id,
        relation_code: "sibling",
        invitee_full_name: "Em",
        invitee_gender: "female",
        invitee_user_id: inviteeUser.id,
        invitee_dob: "1998-07-20",
      }),
    });
    const inviteBody = await inviteRes.json();

    const inviteeClient = await signInAs(inviteeEmail, "password123");
    const inviteeToken = await accessTokenFor(inviteeClient);
    const acceptRes = await fetch(functionUrl("respond-invite"), {
      method: "POST",
      headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteBody.invite_id, action: "accept" }),
    });
    expect(acceptRes.status).toBe(200);
    const acceptBody = await acceptRes.json();

    const { data: newPerson } = await svc.from("persons").select("dob").eq("id", acceptBody.person_id).single();
    expect(newPerson!.dob).toBe("1998-07-20");
  });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run tests/functions/respond-invite.test.ts`
Expected: FAIL — new person's `dob` is `null` because `respond-invite` doesn't copy it yet.

- [ ] **Step 8: Copy `invitee_dob` into the new person's `dob` in respond-invite**

Replace the full contents of `supabase/functions/respond-invite/index.ts`:
```ts
import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { invite_id, action } = await req.json();
  if (!invite_id || !["accept", "decline"].includes(action)) {
    return jsonResponse({ error: "invite_id and a valid action are required" }, 400);
  }

  const svc = getServiceClient();
  const { data: invite, error: fetchErr } = await svc
    .from("invites")
    .select("*")
    .eq("id", invite_id)
    .single();
  if (fetchErr || !invite) return jsonResponse({ error: "invite not found" }, 404);
  if (invite.invitee_user_id !== userId) return jsonResponse({ error: "not your invite" }, 403);
  if (invite.status !== "pending") return jsonResponse({ error: "invite already resolved" }, 409);

  if (action === "decline") {
    await svc.from("invites").update({ status: "declined" }).eq("id", invite_id);
    return jsonResponse({});
  }

  const { data: target, error: targetErr } = await svc
    .from("persons")
    .select("generation_number")
    .eq("id", invite.proposed_relationship_with_person_id)
    .single();
  if (targetErr || !target) return jsonResponse({ error: "relationship target not found" }, 500);

  const generation = invite.resolved_generation;

  const { data: person, error: personErr } = await svc
    .from("persons")
    .insert({
      clan_id: invite.clan_id,
      full_name: invite.invitee_full_name,
      gender: invite.invitee_gender,
      dob: invite.invitee_dob,
      generation_number: generation,
      linked_user_id: userId,
      role: "member",
    })
    .select()
    .single();
  if (personErr) return jsonResponse({ error: personErr.message }, 500);

  // relationships convention: from_person_id = parent/ancestor, to_person_id = child/descendant
  // (see would_create_cycle / shift_descendant_generations, which walk from_person_id -> to_person_id
  // as ancestor -> descendant). For spouse, direction is arbitrary (no hierarchy). For parent_child,
  // whichever side has the lower generation_number is the parent.
  let fromId: string;
  let toId: string;
  if (invite.proposed_relationship_type === "spouse") {
    fromId = person.id;
    toId = invite.proposed_relationship_with_person_id;
  } else if (generation < target.generation_number) {
    fromId = person.id; // new person is the parent (older generation)
    toId = invite.proposed_relationship_with_person_id;
  } else {
    fromId = invite.proposed_relationship_with_person_id; // target is the parent
    toId = person.id;
  }
  const { error: relErr } = await svc.from("relationships").insert({
    clan_id: invite.clan_id,
    from_person_id: fromId,
    to_person_id: toId,
    type: invite.proposed_relationship_type,
  });
  if (relErr) return jsonResponse({ error: relErr.message }, 500);

  await svc.from("invites").update({ status: "accepted" }).eq("id", invite_id);
  return jsonResponse({ person_id: person.id });
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run tests/functions/respond-invite.test.ts`
Expected: PASS (all tests including the new one).

- [ ] **Step 10: Update the client-side type**

In `app/src/api/types.ts`, add `invitee_dob` to `InviteMemberParams`:
```ts
export interface InviteMemberParams {
  clan_id: string;
  anchor_person_id: string;
  relation_code: RelationCode;
  invitee_full_name: string;
  invitee_gender?: 'male' | 'female' | 'unknown';
  invitee_dob?: string;
  invitee_user_id?: string;
  invitee_phone_or_email?: string;
}
```

- [ ] **Step 11: Run the full backend suite and app tsc**

Run (repo root): `npx vitest run` — expect all files pass (17 files after this task's 2 new tests).
Run (from `app/`): `npx tsc --noEmit` — expect no output (the `InviteMemberParams` change is additive/optional, nothing currently passing this type needs to change).

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/20260707130000_add_invitee_dob_to_invites.sql supabase/functions/invite-member/index.ts supabase/functions/respond-invite/index.ts app/src/api/types.ts tests/functions/invite-member.test.ts tests/functions/respond-invite.test.ts
git commit -m "feat(db): thread invitee_dob through invite-member and respond-invite"
```

---

## Task 2: `update-my-person-info` Edge Function + client wrapper

**Files:**
- Create: `supabase/functions/update-my-person-info/index.ts`
- Create: `app/src/api/updateMyPersonInfo.ts`
- Test: `tests/functions/update-my-person-info.test.ts`
- Test: `app/src/api/__tests__/api.test.ts` (add a new `describe` block)

**Interfaces:**
- Consumes: `getServiceClient`, `getRequestUserId`, `jsonResponse` (`_shared/client.ts`, unchanged).
- Produces: `updateMyPersonInfo({ dob: string }): Promise<void>` — the client wrapper Task 4 will call to save the current user's `dob`. Updates `persons.dob` for every `persons` row where `linked_user_id` equals the caller (handles a user linked into more than one clan).

- [ ] **Step 1: Write the failing backend test**

Create `tests/functions/update-my-person-info.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createTestUser, signInAs, accessTokenFor, functionUrl, serviceClient } from "../helpers/client";

describe("update-my-person-info function", () => {
  it("updates dob on every person linked to the caller, and no one else's", async () => {
    const svc = serviceClient();
    const email = `updinfo-${Date.now()}-${Math.random()}@example.com`;
    const user = await createTestUser(email, "password123");
    await svc.from("users").insert({ id: user.id, full_name: "Caller" });

    const { data: clanA } = await svc
      .from("clans")
      .insert({ name: "Clan A", branch_type: "noi", created_by: user.id })
      .select()
      .single();
    const { data: personA } = await svc
      .from("persons")
      .insert({ clan_id: clanA!.id, full_name: "Caller", generation_number: 15, linked_user_id: user.id, role: "admin" })
      .select()
      .single();

    const { data: clanB } = await svc
      .from("clans")
      .insert({ name: "Clan B", branch_type: "ngoai", created_by: user.id })
      .select()
      .single();
    const { data: personB } = await svc
      .from("persons")
      .insert({ clan_id: clanB!.id, full_name: "Caller", generation_number: 10, linked_user_id: user.id, role: "member" })
      .select()
      .single();

    const otherEmail = `updinfoother-${Date.now()}@example.com`;
    const otherUser = await createTestUser(otherEmail, "password123");
    await svc.from("users").insert({ id: otherUser.id, full_name: "Other" });
    const { data: otherPerson } = await svc
      .from("persons")
      .insert({ clan_id: clanA!.id, full_name: "Other", generation_number: 15, linked_user_id: otherUser.id, role: "member" })
      .select()
      .single();

    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);
    const res = await fetch(functionUrl("update-my-person-info"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dob: "1988-11-02" }),
    });
    expect(res.status).toBe(200);

    const { data: rows } = await svc
      .from("persons")
      .select("id, dob")
      .in("id", [personA!.id, personB!.id, otherPerson!.id]);
    const byId = Object.fromEntries(rows!.map((r) => [r.id, r.dob]));
    expect(byId[personA!.id]).toBe("1988-11-02");
    expect(byId[personB!.id]).toBe("1988-11-02");
    expect(byId[otherPerson!.id]).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await fetch(functionUrl("update-my-person-info"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dob: "1988-11-02" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a request missing dob", async () => {
    const email = `updinfobad-${Date.now()}@example.com`;
    const user = await createTestUser(email, "password123");
    await serviceClient().from("users").insert({ id: user.id, full_name: "Caller" });
    const client = await signInAs(email, "password123");
    const token = await accessTokenFor(client);

    const res = await fetch(functionUrl("update-my-person-info"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (repo root): `npx vitest run tests/functions/update-my-person-info.test.ts`
Expected: FAIL — the function doesn't exist yet (connection/404 error).

- [ ] **Step 3: Implement the Edge Function**

Create `supabase/functions/update-my-person-info/index.ts`:
```ts
import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { dob } = await req.json();
  if (!dob) return jsonResponse({ error: "dob is required" }, 400);

  const svc = getServiceClient();
  const { error } = await svc.from("persons").update({ dob }).eq("linked_user_id", userId);
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({});
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/functions/update-my-person-info.test.ts`
Expected: PASS (3 tests). Note: new Edge Functions require a Supabase restart to be picked up — if you get a 404/connection error even after creating the file, run `npx supabase stop` then `npx supabase start` from the repo root before retrying.

- [ ] **Step 5: Write the failing client wrapper test**

Add this `describe` block to `app/src/api/__tests__/api.test.ts` (append at the end of the file):
```ts
import { updateMyPersonInfo } from '../updateMyPersonInfo';

describe('updateMyPersonInfo', () => {
  it('invokes the update-my-person-info function with the given dob', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: {}, error: null });

    await updateMyPersonInfo({ dob: '1990-05-12' });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('update-my-person-info', {
      body: { dob: '1990-05-12' },
    });
  });

  it('throws ApiError when the function returns an error', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'dob is required' },
    });

    await expect(updateMyPersonInfo({ dob: '' })).rejects.toThrow(ApiError);
  });
});
```

(The `import { updateMyPersonInfo } from '../updateMyPersonInfo';` line goes with the file's other imports at the top, not inline where shown above — move it up next to the existing `import { createClan } from '../createClan';` line.)

- [ ] **Step 6: Run test to verify it fails**

Run (from `app/`): `npx jest src/api/__tests__/api.test.ts`
Expected: FAIL — cannot find module `../updateMyPersonInfo`.

- [ ] **Step 7: Implement the client wrapper**

Create `app/src/api/updateMyPersonInfo.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function updateMyPersonInfo(params: { dob: string }): Promise<void> {
  const { error } = await supabase.functions.invoke('update-my-person-info', { body: params });
  if (error) throw new ApiError(error.message);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/api/__tests__/api.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones).

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/update-my-person-info/index.ts app/src/api/updateMyPersonInfo.ts tests/functions/update-my-person-info.test.ts app/src/api/__tests__/api.test.ts
git commit -m "feat(app): add update-my-person-info function for self-service dob updates"
```

---

## Task 3: Add required `dob` input to the invite-member screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/invite.tsx`

**Interfaces:**
- Consumes: `InviteMemberParams` (Task 1, now has optional `invitee_dob`).
- Produces: no change to `inviteMember(...)`'s other fields or `router.back()`. This screen has no dedicated test file today (confirmed in Wave 2) — verify via the full app test suite.

- [ ] **Step 1: Confirm there is no existing test to preserve**

Confirm `app/src/app/(main)/clan/[id]/__tests__/invite.test.tsx` does not exist today.

- [ ] **Step 2: Add the dob field and conditional validation**

Replace the full contents of `app/src/app/(main)/clan/[id]/invite.tsx`:
```tsx
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { inviteMember } from '@/api/inviteMember';
import type { RelationCode } from '@/api/types';
import { PrimaryButton } from '@/components/PrimaryButton';
import { relationLabels } from '@/constants/relationLabels';
import { useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

const relationCodes = Object.keys(relationLabels) as RelationCode[];
const DOB_REQUIRED_CODES: RelationCode[] = ['sibling', 'father_sibling', 'mother_sibling'];

export default function InviteMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: members } = useClanMembers(id);

  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [anchorMenuOpen, setAnchorMenuOpen] = useState(false);
  const [relationCode, setRelationCode] = useState<RelationCode | null>(null);
  const [relationMenuOpen, setRelationMenuOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [dob, setDob] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const anchorName = useMemo(
    () => members?.find((member) => member.id === anchorId)?.full_name ?? 'Chọn người neo',
    [anchorId, members]
  );
  const relationLabel = relationCode ? relationLabels[relationCode] : 'Chọn quan hệ';
  const dobRequired = relationCode !== null && DOB_REQUIRED_CODES.includes(relationCode);

  async function handleInvite() {
    if (!anchorId || !relationCode || !fullName.trim() || !contact.trim()) {
      setError('Vui lòng nhập đủ tên, liên hệ, người neo và quan hệ.');
      return;
    }
    if (dobRequired && !dob.trim()) {
      setError('Quan hệ này cần ngày sinh để tính đúng xưng hô (vd anh/chị/em, bác/chú/cô).');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await inviteMember({
        clan_id: id,
        anchor_person_id: anchorId,
        relation_code: relationCode,
        invitee_full_name: fullName.trim(),
        invitee_gender: gender,
        invitee_dob: dob.trim() || undefined,
        invitee_phone_or_email: contact.trim(),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mời thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Mời thành viên
      </Text>

      <Menu
        visible={anchorMenuOpen}
        onDismiss={() => setAnchorMenuOpen(false)}
        anchor={
          <Button mode="outlined" textColor={brand.text.body} onPress={() => setAnchorMenuOpen(true)} style={styles.field}>
            {anchorName}
          </Button>
        }
      >
        {(members ?? []).map((member) => (
          <Menu.Item
            key={member.id}
            title={member.full_name}
            onPress={() => {
              setAnchorId(member.id);
              setAnchorMenuOpen(false);
            }}
          />
        ))}
      </Menu>

      <Menu
        visible={relationMenuOpen}
        onDismiss={() => setRelationMenuOpen(false)}
        anchor={
          <Button mode="outlined" textColor={brand.text.body} onPress={() => setRelationMenuOpen(true)} style={styles.field}>
            {relationLabel}
          </Button>
        }
      >
        {relationCodes.map((code) => (
          <Menu.Item
            key={code}
            title={relationLabels[code]}
            onPress={() => {
              setRelationCode(code);
              setRelationMenuOpen(false);
            }}
          />
        ))}
      </Menu>

      <TextInput
        label="Họ tên người được mời"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.field}
      />
      <SegmentedButtons
        value={gender}
        onValueChange={(value) => setGender(value as 'male' | 'female' | 'unknown')}
        buttons={[
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' },
          { value: 'unknown', label: 'Khác' },
        ]}
        style={styles.field}
      />
      <TextInput
        label={dobRequired ? 'Ngày sinh (bắt buộc, dạng NĂM-THÁNG-NGÀY)' : 'Ngày sinh (tùy chọn, dạng NĂM-THÁNG-NGÀY)'}
        value={dob}
        onChangeText={setDob}
        placeholder="1990-05-12"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.field}
      />
      <TextInput
        label="Email hoặc số điện thoại"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
        keyboardType="email-address"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.field}
      />
      <HelperText type={error ? 'error' : 'info'} visible>
        {error ?? 'Stage 1 chỉ hỗ trợ mời bằng email hoặc số điện thoại.'}
      </HelperText>

      <PrimaryButton onPress={handleInvite} loading={submitting} disabled={submitting}>
        Gửi lời mời
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#180d08' },
  container: { padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  field: { backgroundColor: 'transparent', marginBottom: 14 },
});
```

- [ ] **Step 3: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/invite.tsx
git commit -m "feat(app): require dob when inviting a sibling, aunt, or uncle"
```

---

## Task 4: Add `dob` input to the profile screen, backed by `useMyProfile` + `update-my-person-info`

**Files:**
- Modify: `app/src/queries/useMyProfile.ts`
- Modify: `app/src/queries/__tests__/useMyProfile.test.tsx`
- Modify: `app/src/app/(main)/profile.tsx`

**Interfaces:**
- Consumes: `updateMyPersonInfo` (Task 2).
- Produces: `ProfileRow` gains `dob: string | null`, sourced from the user's own linked `persons` row (not `users.dob`, which this app never uses — the kinship algorithm reads `persons.dob`). `useMyProfile()`'s query shape changes (now does 2 reads instead of 1) — this is a genuine behavior change, so the existing test needs updating, not just preserving.

- [ ] **Step 1: Read the existing test to understand what must still pass**

Read `app/src/queries/__tests__/useMyProfile.test.tsx` — note it currently mocks a single `.from(...)` call shape. This task changes that shape (two different tables queried), so the mock needs restructuring, not just untouched preservation.

- [ ] **Step 2: Write the updated (failing) test**

Replace the full contents of `app/src/queries/__tests__/useMyProfile.test.tsx`:
```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { updateMyProfile, useMyProfile } from '../useMyProfile';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../lib/AuthContext', () => ({ useAuth: jest.fn() }), { virtual: true });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useMyProfile();
  return <Text>{isSuccess ? `${data?.full_name}|${data?.dob}` : 'loading'}</Text>;
}

function mockFromForUsersAndPersons(userRow: Record<string, unknown>, personDob: string | null) {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'users') {
      const single = jest.fn().mockResolvedValue({ data: userRow, error: null });
      const eq = jest.fn().mockReturnValue({ single });
      return { select: jest.fn().mockReturnValue({ eq }) };
    }
    if (table === 'persons') {
      const maybeSingle = jest.fn().mockResolvedValue({ data: personDob === null ? null : { dob: personDob }, error: null });
      const limit = jest.fn().mockReturnValue({ maybeSingle });
      const eq = jest.fn().mockReturnValue({ limit });
      return { select: jest.fn().mockReturnValue({ eq }) };
    }
    throw new Error(`unexpected table: ${table}`);
  });
}

describe('useMyProfile', () => {
  it('fetches the current user row and the linked person dob', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    mockFromForUsersAndPersons({ id: 'u1', full_name: 'Duy' }, '1990-05-12');

    render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Duy|1990-05-12'));
  });

  it('returns dob null when the user has no linked person row yet', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    mockFromForUsersAndPersons({ id: 'u1', full_name: 'Duy' }, null);

    render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Duy|null'));
  });
});

describe('updateMyProfile', () => {
  it('updates the row for the given user id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    await updateMyProfile('u1', { occupation: 'Ky su' });

    expect(update).toHaveBeenCalledWith({ occupation: 'Ky su' });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `app/`): `npx jest src/queries/__tests__/useMyProfile.test.tsx`
Expected: FAIL — `ProfileRow`/`useMyProfile` doesn't fetch `dob` yet.

- [ ] **Step 4: Extend `useMyProfile` to fetch the linked person's `dob`**

Replace the full contents of `app/src/queries/useMyProfile.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  invite_code: string;
  dob: string | null;
}

export function useMyProfile() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-profile', session?.user.id],
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, email, occupation, address, invite_code')
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;

      const { data: personRow } = await supabase
        .from('persons')
        .select('dob')
        .eq('linked_user_id', session!.user.id)
        .limit(1)
        .maybeSingle();

      return { ...data, dob: personRow?.dob ?? null } as ProfileRow;
    },
    enabled: !!session,
  });
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'occupation' | 'address'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw error;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useMyProfile.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Add the `dob` field to the profile screen**

Replace the full contents of `app/src/app/(main)/profile.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { updateMyPersonInfo } from '@/api/updateMyPersonInfo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/AuthContext';
import { updateMyProfile, useMyProfile } from '@/queries/useMyProfile';
import { brand } from '@/theme/brand';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setOccupation(profile.occupation ?? '');
      setAddress(profile.address ?? '');
      setDob(profile.dob ?? '');
    }
  }, [profile]);

  async function handleSave() {
    if (!session) return;

    setSaving(true);
    try {
      await updateMyProfile(session.user.id, { full_name: fullName, phone, occupation, address });
      if (dob.trim()) {
        await updateMyPersonInfo({ dob: dob.trim() });
      }
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } finally {
      setSaving(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Hồ sơ cá nhân</Text>
      <TextInput
        label="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nghề nghiệp"
        value={occupation}
        onChangeText={setOccupation}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nơi ở"
        value={address}
        onChangeText={setAddress}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Ngày sinh (dạng NĂM-THÁNG-NGÀY, vd 1990-05-12)"
        value={dob}
        onChangeText={setDob}
        placeholder="1990-05-12"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      {profile && <Text variant="bodySmall" style={styles.muted}>Mã mời: {profile.invite_code}</Text>}
      <PrimaryButton onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
        Lưu
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#180d08' },
  container: { padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  input: { backgroundColor: 'transparent', marginBottom: 14 },
  muted: { color: brand.text.muted },
  button: { marginTop: 16 },
});
```

- [ ] **Step 7: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 8: Commit**

```bash
git add app/src/queries/useMyProfile.ts app/src/queries/__tests__/useMyProfile.test.tsx app/src/app/\(main\)/profile.tsx
git commit -m "feat(app): add dob field to profile screen backed by update-my-person-info"
```

---

## Task 5: `get_kinship_terms` Postgres function (the core algorithm)

**Files:**
- Create: `supabase/migrations/20260707140000_add_get_kinship_terms_function.sql`
- Test: `tests/db/kinship_terms.test.ts`

**Interfaces:**
- Consumes: `persons`, `relationships` (unchanged schema).
- Produces: `get_kinship_terms(p_clan_id uuid, p_ego_person_id uuid) returns table(person_id uuid, term text, is_ambiguous boolean)` — callable directly by `authenticated` clients via `supabase.rpc(...)`. Task 6's hook is the only consumer added in this plan.

**IMPORTANT — a correctness subtlety found while designing this task:** siblings must be detected by "shares *any* recorded parent" (regardless of that parent's `gender`), NOT by "shares a `gender = 'male'` father specifically." Stage 1's resolver creates `gender = 'unknown'` placeholder parents for some codes (`sibling`, and the grandparent step inside `father_sibling`/`mother_sibling` — see `getOrCreateAnyParent` in `_shared/relations.ts`). If sibling-detection only matched on gender-known `father_id`/`mother_id`, two people who share only an `unknown`-gender parent would never be recognized as siblings at all. The function below uses two gender-agnostic `parent1_id`/`parent2_id` slots for sibling detection, and separately derived gender-specific `father_id`/`mother_id` (used only for grandparent/aunt/uncle lookups, where knowing the side is unavoidable).

**Known, accepted gap (documented here rather than fixed, to keep this task's scope bounded):** if the ONLY link between ego and an ancestor two generations up is through a `gender = 'unknown'` parent (i.e. `father_id`/`mother_id` are both null for that hop because the connecting parent's gender was never recorded), aunt/uncle and cousin detection through that hop silently falls through to `term = null` ("out of scope") rather than a flagged `is_ambiguous = true` "can't determine" result. The design spec's "thiếu gender → is_ambiguous" intent is met for every case this plan's tests actually construct; this residual gap only arises when an unknown-gender parent (itself only ever created via the `sibling`/`getOrCreateAnyParent` resolver path) is later discovered to have their own recorded siblings — a deep, rare case not worth the extra branching here. Revisit only if real usage surfaces it.

- [ ] **Step 1: Write the failing tests**

Create `tests/db/kinship_terms.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { serviceClient } from "../helpers/client";

const admin = serviceClient();
let clanId: string;

async function makePerson(overrides: Partial<{ full_name: string; gender: string; dob: string; generation_number: number }>) {
  const { data, error } = await admin
    .from("persons")
    .insert({
      clan_id: clanId,
      full_name: overrides.full_name ?? "Person",
      gender: overrides.gender ?? "unknown",
      dob: overrides.dob ?? null,
      generation_number: overrides.generation_number ?? 15,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

async function linkParent(parentId: string, childId: string) {
  const { error } = await admin
    .from("relationships")
    .insert({ clan_id: clanId, from_person_id: parentId, to_person_id: childId, type: "parent_child" });
  if (error) throw new Error(error.message);
}

async function linkSpouse(aId: string, bId: string) {
  const { error } = await admin
    .from("relationships")
    .insert({ clan_id: clanId, from_person_id: aId, to_person_id: bId, type: "spouse" });
  if (error) throw new Error(error.message);
}

function termFor(rows: { person_id: string; term: string | null; is_ambiguous: boolean }[], id: string) {
  return rows.find((r) => r.person_id === id);
}

beforeAll(async () => {
  const { data: user } = await admin.auth.admin.createUser({
    email: `kinship-${Date.now()}@example.com`,
    password: "password123",
    email_confirm: true,
  });
  await admin.from("users").insert({ id: user.user!.id, full_name: "Owner" });
  const { data: clan } = await admin
    .from("clans")
    .insert({ name: "Ho Kinship", branch_type: "noi", created_by: user.user!.id })
    .select()
    .single();
  clanId = clan!.id;
});

describe("get_kinship_terms", () => {
  it("computes cha/mẹ, ông bà nội/ngoại, con, and cháu", async () => {
    const pgf = await makePerson({ full_name: "PGF", gender: "male", generation_number: 13 });
    const pgm = await makePerson({ full_name: "PGM", gender: "female", generation_number: 13 });
    const mgf = await makePerson({ full_name: "MGF", gender: "male", generation_number: 13 });
    const mgm = await makePerson({ full_name: "MGM", gender: "female", generation_number: 13 });
    const father = await makePerson({ full_name: "Father", gender: "male", generation_number: 14 });
    const mother = await makePerson({ full_name: "Mother", gender: "female", generation_number: 14 });
    const ego = await makePerson({ full_name: "Ego", gender: "male", generation_number: 15 });
    const child = await makePerson({ full_name: "Child", gender: "female", generation_number: 16 });
    const grandchild = await makePerson({ full_name: "Grandchild", gender: "male", generation_number: 17 });

    await linkParent(pgf, father);
    await linkParent(pgm, father);
    await linkParent(mgf, mother);
    await linkParent(mgm, mother);
    await linkParent(father, ego);
    await linkParent(mother, ego);
    await linkParent(ego, child);
    await linkParent(child, grandchild);

    const { data, error } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: ego });
    if (error) throw new Error(error.message);

    expect(termFor(data!, father)?.term).toBe("cha");
    expect(termFor(data!, mother)?.term).toBe("mẹ");
    expect(termFor(data!, pgf)?.term).toBe("ông nội");
    expect(termFor(data!, pgm)?.term).toBe("bà nội");
    expect(termFor(data!, mgf)?.term).toBe("ông ngoại");
    expect(termFor(data!, mgm)?.term).toBe("bà ngoại");
    expect(termFor(data!, child)?.term).toBe("con");
    expect(termFor(data!, grandchild)?.term).toBe("cháu");
  });

  it("computes anh/chị/em ruột by comparing dob, and flags ambiguous when dob is missing", async () => {
    const father = await makePerson({ full_name: "Father2", gender: "male", generation_number: 14 });
    const sisterOlder = await makePerson({ full_name: "SisterOlder", gender: "female", dob: "1990-01-01", generation_number: 15 });
    const brotherYounger = await makePerson({ full_name: "BrotherYounger", gender: "male", dob: "1995-06-15", generation_number: 15 });
    const siblingNoDob = await makePerson({ full_name: "SiblingNoDob", gender: "male", generation_number: 15 });

    await linkParent(father, sisterOlder);
    await linkParent(father, brotherYounger);
    await linkParent(father, siblingNoDob);

    const { data: fromBrother, error: err1 } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: brotherYounger });
    if (err1) throw new Error(err1.message);
    expect(termFor(fromBrother!, sisterOlder)?.term).toBe("chị");
    expect(termFor(fromBrother!, sisterOlder)?.is_ambiguous).toBe(false);
    expect(termFor(fromBrother!, siblingNoDob)?.term).toBe("anh/em");
    expect(termFor(fromBrother!, siblingNoDob)?.is_ambiguous).toBe(true);

    const { data: fromSister, error: err2 } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: sisterOlder });
    if (err2) throw new Error(err2.message);
    expect(termFor(fromSister!, brotherYounger)?.term).toBe("em");
  });

  it("computes anh/chị/em họ via a shared grandparent (different parents)", async () => {
    const pgf = await makePerson({ full_name: "CousinPGF", gender: "male", generation_number: 13 });
    const fatherA = await makePerson({ full_name: "FatherA", gender: "male", generation_number: 14 });
    const fatherB = await makePerson({ full_name: "FatherB", gender: "male", generation_number: 14 });
    const egoM = await makePerson({ full_name: "EgoCousinMale", gender: "male", dob: "2000-01-01", generation_number: 15 });
    const cousinYounger = await makePerson({ full_name: "CousinYounger", gender: "female", dob: "2002-03-01", generation_number: 15 });

    await linkParent(pgf, fatherA);
    await linkParent(pgf, fatherB);
    await linkParent(fatherA, egoM);
    await linkParent(fatherB, cousinYounger);

    const { data, error } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: egoM });
    if (error) throw new Error(error.message);
    expect(termFor(data!, cousinYounger)?.term).toBe("em họ");

    const { data: fromCousin, error: err2 } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: cousinYounger });
    if (err2) throw new Error(err2.message);
    expect(termFor(fromCousin!, egoM)?.term).toBe("anh họ");
  });

  it("computes bác/chú/cô (paternal) and cậu/dì (maternal), and cháu for the reverse direction", async () => {
    const father = await makePerson({ full_name: "Father3", gender: "male", dob: "1970-01-01", generation_number: 14 });
    const mother = await makePerson({ full_name: "Mother3", gender: "female", generation_number: 14 });
    const paternalUncleOlder = await makePerson({ full_name: "PaternalUncleOlder", gender: "male", dob: "1965-01-01", generation_number: 14 });
    const paternalUncleYounger = await makePerson({ full_name: "PaternalUncleYounger", gender: "male", dob: "1975-01-01", generation_number: 14 });
    const paternalAunt = await makePerson({ full_name: "PaternalAunt", gender: "female", generation_number: 14 });
    const maternalUncle = await makePerson({ full_name: "MaternalUncle", gender: "male", generation_number: 14 });
    const maternalAunt = await makePerson({ full_name: "MaternalAunt", gender: "female", generation_number: 14 });
    const grandfatherP = await makePerson({ full_name: "GrandfatherP", gender: "male", generation_number: 13 });
    const grandfatherM = await makePerson({ full_name: "GrandfatherM", gender: "male", generation_number: 13 });
    const ego = await makePerson({ full_name: "EgoNiece", gender: "female", generation_number: 15 });

    await linkParent(grandfatherP, father);
    await linkParent(grandfatherP, paternalUncleOlder);
    await linkParent(grandfatherP, paternalUncleYounger);
    await linkParent(grandfatherP, paternalAunt);
    await linkParent(grandfatherM, mother);
    await linkParent(grandfatherM, maternalUncle);
    await linkParent(grandfatherM, maternalAunt);
    await linkParent(father, ego);
    await linkParent(mother, ego);

    const { data, error } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: ego });
    if (error) throw new Error(error.message);
    expect(termFor(data!, paternalUncleOlder)?.term).toBe("bác");
    expect(termFor(data!, paternalUncleYounger)?.term).toBe("chú");
    expect(termFor(data!, paternalAunt)?.term).toBe("cô");
    expect(termFor(data!, maternalUncle)?.term).toBe("cậu");
    expect(termFor(data!, maternalAunt)?.term).toBe("dì");

    const { data: fromUncle, error: err2 } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: paternalUncleOlder });
    if (err2) throw new Error(err2.message);
    expect(termFor(fromUncle!, ego)?.term).toBe("cháu");
  });

  it("computes vợ/chồng for a direct spouse relationship, and null for out-of-scope relations", async () => {
    const husband = await makePerson({ full_name: "Husband", gender: "male", generation_number: 15 });
    const wife = await makePerson({ full_name: "Wife", gender: "female", generation_number: 15 });
    const stranger = await makePerson({ full_name: "Stranger", gender: "unknown", generation_number: 15 });
    await linkSpouse(husband, wife);

    const { data, error } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: husband });
    if (error) throw new Error(error.message);
    expect(termFor(data!, wife)?.term).toBe("vợ");
    expect(termFor(data!, stranger)?.term).toBeNull();

    const { data: fromWife, error: err2 } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: wife });
    if (err2) throw new Error(err2.message);
    expect(termFor(fromWife!, husband)?.term).toBe("chồng");
  });

  it("recognizes siblings who share only an unknown-gender parent (the sibling/getOrCreateAnyParent resolver path)", async () => {
    const unknownParent = await makePerson({ full_name: "UnknownParent", gender: "unknown", generation_number: 14 });
    const siblingA = await makePerson({ full_name: "SibA", gender: "male", dob: "2000-01-01", generation_number: 15 });
    const siblingB = await makePerson({ full_name: "SibB", gender: "female", dob: "2003-01-01", generation_number: 15 });

    await linkParent(unknownParent, siblingA);
    await linkParent(unknownParent, siblingB);

    const { data, error } = await admin.rpc("get_kinship_terms", { p_clan_id: clanId, p_ego_person_id: siblingA });
    if (error) throw new Error(error.message);
    expect(termFor(data!, siblingB)?.term).toBe("em");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (repo root, Docker/Supabase running): `npx vitest run tests/db/kinship_terms.test.ts`
Expected: FAIL — `get_kinship_terms` does not exist yet.

- [ ] **Step 3: Implement the migration**

Create `supabase/migrations/20260707140000_add_get_kinship_terms_function.sql`:
```sql
create or replace function public.get_kinship_terms(p_clan_id uuid, p_ego_person_id uuid)
returns table(person_id uuid, term text, is_ambiguous boolean)
language plpgsql
set search_path = public
as $$
declare
  ego record;
  t record;
  result_term text;
  result_ambiguous boolean;
  is_paternal_sibling_of_parent boolean;
  is_maternal_sibling_of_parent boolean;
  ego_is_paternal_aunt_uncle boolean;
  ego_is_maternal_aunt_uncle boolean;
  shares_grandparent boolean;
begin
  create temporary table if not exists tmp_kinship_ancestors (
    id uuid primary key,
    dob date,
    gender text,
    parent1_id uuid,
    parent2_id uuid,
    father_id uuid,
    father_dob date,
    mother_id uuid,
    pgf_id uuid,
    pgm_id uuid,
    mgf_id uuid,
    mgm_id uuid
  ) on commit drop;

  delete from tmp_kinship_ancestors;

  insert into tmp_kinship_ancestors
  select
    p.id,
    p.dob,
    p.gender,
    parent1.id as parent1_id,
    parent2.id as parent2_id,
    case when parent1.gender = 'male' then parent1.id when parent2.gender = 'male' then parent2.id end as father_id,
    case when parent1.gender = 'male' then parent1.dob when parent2.gender = 'male' then parent2.dob end as father_dob,
    case when parent1.gender = 'female' then parent1.id when parent2.gender = 'female' then parent2.id end as mother_id,
    pgf.id as pgf_id,
    pgm.id as pgm_id,
    mgf.id as mgf_id,
    mgm.id as mgm_id
  from persons p
  left join lateral (
    select pp.id, pp.gender, pp.dob
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = p.id and r.type = 'parent_child'
    order by pp.id
    limit 1
  ) parent1 on true
  left join lateral (
    select pp.id, pp.gender, pp.dob
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = p.id and r.type = 'parent_child' and pp.id is distinct from parent1.id
    order by pp.id
    limit 1
  ) parent2 on true
  left join lateral (
    select pp.id
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = (case when parent1.gender = 'male' then parent1.id when parent2.gender = 'male' then parent2.id end)
      and r.type = 'parent_child' and pp.gender = 'male'
    limit 1
  ) pgf on true
  left join lateral (
    select pp.id
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = (case when parent1.gender = 'male' then parent1.id when parent2.gender = 'male' then parent2.id end)
      and r.type = 'parent_child' and pp.gender = 'female'
    limit 1
  ) pgm on true
  left join lateral (
    select pp.id
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = (case when parent1.gender = 'female' then parent1.id when parent2.gender = 'female' then parent2.id end)
      and r.type = 'parent_child' and pp.gender = 'male'
    limit 1
  ) mgf on true
  left join lateral (
    select pp.id
    from relationships r join persons pp on pp.id = r.from_person_id
    where r.to_person_id = (case when parent1.gender = 'female' then parent1.id when parent2.gender = 'female' then parent2.id end)
      and r.type = 'parent_child' and pp.gender = 'female'
    limit 1
  ) mgm on true
  where p.clan_id = p_clan_id;

  select * into ego from tmp_kinship_ancestors where id = p_ego_person_id;

  for t in select * from tmp_kinship_ancestors where id <> p_ego_person_id loop
    result_term := null;
    result_ambiguous := false;

    if t.id = ego.father_id then
      result_term := 'cha';
    elsif t.id = ego.mother_id then
      result_term := 'mẹ';
    elsif t.id = ego.pgf_id then
      result_term := 'ông nội';
    elsif t.id = ego.pgm_id then
      result_term := 'bà nội';
    elsif t.id = ego.mgf_id then
      result_term := 'ông ngoại';
    elsif t.id = ego.mgm_id then
      result_term := 'bà ngoại';
    elsif ego.id = t.father_id or ego.id = t.mother_id then
      result_term := 'con';
    elsif ego.id in (t.pgf_id, t.pgm_id, t.mgf_id, t.mgm_id) then
      result_term := 'cháu';
    elsif exists (
      select 1 from relationships r where r.type = 'spouse'
        and ((r.from_person_id = ego.id and r.to_person_id = t.id) or (r.from_person_id = t.id and r.to_person_id = ego.id))
    ) then
      if t.gender = 'female' then
        result_term := 'vợ';
      elsif t.gender = 'male' then
        result_term := 'chồng';
      else
        result_term := 'vợ/chồng';
        result_ambiguous := true;
      end if;
    elsif (ego.parent1_id is not null and ego.parent1_id in (t.parent1_id, t.parent2_id))
       or (ego.parent2_id is not null and ego.parent2_id in (t.parent1_id, t.parent2_id)) then
      -- anh chị em ruột: chung bất kỳ cha/mẹ nào đã ghi nhận, không cần biết giới tính người nối
      if ego.dob is null or t.dob is null then
        result_ambiguous := true;
        result_term := case when t.gender = 'male' then 'anh/em' when t.gender = 'female' then 'chị/em' else 'anh/chị/em' end;
      elsif t.gender not in ('male', 'female') then
        result_ambiguous := true;
        result_term := case when t.dob < ego.dob then 'anh/chị' else 'em' end;
      elsif t.dob < ego.dob then
        result_term := case when t.gender = 'male' then 'anh' else 'chị' end;
      else
        result_term := 'em';
      end if;
    else
      is_paternal_sibling_of_parent :=
        ego.father_id is not null and (
          (ego.pgf_id is not null and ego.pgf_id = t.father_id) or
          (ego.pgm_id is not null and ego.pgm_id = t.mother_id)
        );
      is_maternal_sibling_of_parent :=
        ego.mother_id is not null and (
          (ego.mgf_id is not null and ego.mgf_id = t.father_id) or
          (ego.mgm_id is not null and ego.mgm_id = t.mother_id)
        );
      ego_is_paternal_aunt_uncle :=
        t.father_id is not null and (
          (t.pgf_id is not null and t.pgf_id = ego.father_id) or
          (t.pgm_id is not null and t.pgm_id = ego.mother_id)
        );
      ego_is_maternal_aunt_uncle :=
        t.mother_id is not null and (
          (t.mgf_id is not null and t.mgf_id = ego.father_id) or
          (t.mgm_id is not null and t.mgm_id = ego.mother_id)
        );
      shares_grandparent :=
        (ego.pgf_id is not null and ego.pgf_id in (t.pgf_id, t.pgm_id, t.mgf_id, t.mgm_id)) or
        (ego.pgm_id is not null and ego.pgm_id in (t.pgf_id, t.pgm_id, t.mgf_id, t.mgm_id)) or
        (ego.mgf_id is not null and ego.mgf_id in (t.pgf_id, t.pgm_id, t.mgf_id, t.mgm_id)) or
        (ego.mgm_id is not null and ego.mgm_id in (t.pgf_id, t.pgm_id, t.mgf_id, t.mgm_id));

      if is_paternal_sibling_of_parent then
        if t.gender = 'female' then
          result_term := 'cô';
        elsif t.gender = 'male' then
          if ego.father_dob is null or t.dob is null then
            result_term := 'bác/chú';
            result_ambiguous := true;
          elsif t.dob < ego.father_dob then
            result_term := 'bác';
          else
            result_term := 'chú';
          end if;
        else
          result_term := 'cô/chú/bác';
          result_ambiguous := true;
        end if;
      elsif is_maternal_sibling_of_parent then
        if t.gender = 'male' then
          result_term := 'cậu';
        elsif t.gender = 'female' then
          result_term := 'dì';
        else
          result_term := 'cậu/dì';
          result_ambiguous := true;
        end if;
      elsif ego_is_paternal_aunt_uncle or ego_is_maternal_aunt_uncle then
        result_term := 'cháu';
      elsif shares_grandparent then
        if ego.dob is null or t.dob is null then
          result_ambiguous := true;
          result_term := case when t.gender = 'male' then 'anh họ/em họ' when t.gender = 'female' then 'chị họ/em họ' else 'anh/chị/em họ' end;
        elsif t.gender not in ('male', 'female') then
          result_ambiguous := true;
          result_term := case when t.dob < ego.dob then 'anh họ/chị họ' else 'em họ' end;
        elsif t.dob < ego.dob then
          result_term := case when t.gender = 'male' then 'anh họ' else 'chị họ' end;
        else
          result_term := 'em họ';
        end if;
      else
        result_term := null;
      end if;
    end if;

    person_id := t.id;
    term := result_term;
    is_ambiguous := result_ambiguous;
    return next;
  end loop;
end;
$$;

grant execute on function public.get_kinship_terms(uuid, uuid) to authenticated;
```

Apply it: `npx supabase db reset` (required after adding any new migration file — see the note in Task 1).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/kinship_terms.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full backend suite**

Run: `npx vitest run`
Expected: all files pass (18 files after Tasks 1, 2, and 5's new test files).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260707140000_add_get_kinship_terms_function.sql tests/db/kinship_terms.test.ts
git commit -m "feat(db): add get_kinship_terms function computing Vietnamese kinship terms"
```

---

## Task 6: `useKinshipTerms` hook

**Files:**
- Create: `app/src/queries/useKinshipTerms.ts`
- Test: `app/src/queries/__tests__/useKinshipTerms.test.tsx`

**Interfaces:**
- Consumes: `get_kinship_terms` RPC (Task 5).
- Produces: `useKinshipTerms(clanId: string, egoPersonId: string | undefined)` — a React Query hook returning `KinshipTermRow[]` (`{ person_id, term, is_ambiguous }`). **Not wired into any screen in this plan** — Stage 2c consumes this hook.

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useKinshipTerms.test.tsx`:
```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../../lib/supabase';
import { useKinshipTerms } from '../useKinshipTerms';

jest.mock('../../lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe({ clanId, egoPersonId }: { clanId: string; egoPersonId: string | undefined }) {
  const { data, isSuccess } = useKinshipTerms(clanId, egoPersonId);
  return <Text>{isSuccess ? JSON.stringify(data) : 'loading'}</Text>;
}

describe('useKinshipTerms', () => {
  it('calls the get_kinship_terms RPC with the given clan and ego ids', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ person_id: 'p2', term: 'chú', is_ambiguous: false }],
      error: null,
    });

    render(<Probe clanId="c1" egoPersonId="p1" />, { wrapper });

    await waitFor(() =>
      screen.getByText(JSON.stringify([{ person_id: 'p2', term: 'chú', is_ambiguous: false }]))
    );
    expect(supabase.rpc).toHaveBeenCalledWith('get_kinship_terms', {
      p_clan_id: 'c1',
      p_ego_person_id: 'p1',
    });
  });

  it('does not call the RPC when egoPersonId is undefined', () => {
    (supabase.rpc as jest.Mock).mockClear();

    render(<Probe clanId="c1" egoPersonId={undefined} />, { wrapper });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `app/`): `npx jest src/queries/__tests__/useKinshipTerms.test.tsx`
Expected: FAIL — cannot find module `../useKinshipTerms`.

- [ ] **Step 3: Implement the hook**

Create `app/src/queries/useKinshipTerms.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface KinshipTermRow {
  person_id: string;
  term: string | null;
  is_ambiguous: boolean;
}

export function useKinshipTerms(clanId: string, egoPersonId: string | undefined) {
  return useQuery({
    queryKey: ['kinship-terms', clanId, egoPersonId],
    queryFn: async (): Promise<KinshipTermRow[]> => {
      const { data, error } = await supabase.rpc('get_kinship_terms', {
        p_clan_id: clanId,
        p_ego_person_id: egoPersonId,
      });

      if (error) throw error;
      return data as KinshipTermRow[];
    },
    enabled: !!clanId && !!egoPersonId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useKinshipTerms.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/queries/useKinshipTerms.ts app/src/queries/__tests__/useKinshipTerms.test.tsx
git commit -m "feat(app): add useKinshipTerms hook"
```

---

## Task 7: Full verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full backend test suite**

Run (repo root, Docker/Supabase running — restart via `npx supabase stop` + `npx supabase start` if the edge functions runtime is down, per the recurring issue documented in `docs/ROADMAP.md`): `npx vitest run`
Expected: all files pass (18 files: the 16 from before this plan, plus `tests/functions/update-my-person-info.test.ts` and `tests/db/kinship_terms.test.ts`; `tests/functions/invite-member.test.ts` and `tests/functions/respond-invite.test.ts` each gained one test).

- [ ] **Step 2: Full app suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass (adds `useKinshipTerms.test.tsx`; `useMyProfile.test.tsx` and `api.test.ts` each changed).

- [ ] **Step 3: Manual smoke check of the new dob fields**

Using the same Playwright/manual pattern established in prior waves: sign in, open "Mời thành viên" for an existing member, select relation `Anh/chị/em`, confirm the ngày sinh field now shows as required (attempting submit without it shows the new error message); open "Hồ sơ cá nhân", set a ngày sinh, save, reload the screen, confirm it persists (proves `update-my-person-info` actually wrote to `persons.dob` and `useMyProfile` reads it back correctly end-to-end, not just under mocked tests).

- [ ] **Step 4: Report results to the user**

Summarize: backend + app test counts, tsc status, and the manual dob smoke-check outcome. Note explicitly that **no screen displays kinship terms yet** — `get_kinship_terms` and `useKinshipTerms` are fully built and tested but unused by any UI, which is correct and expected per this plan's scope (Stage 2c wires the display).
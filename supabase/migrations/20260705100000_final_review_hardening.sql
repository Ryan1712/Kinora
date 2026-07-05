-- Final-review hardening (defense-in-depth; no behavior change for the app).

-- A. The `anon` select grant on public.users is inert: the users_select_own
-- policy (auth.uid() = id) always evaluates false for the anon role, since
-- anon requests carry no auth.uid(). Revoke the unnecessary grant rather
-- than editing the already-applied 20260701181421_create_users.sql.
revoke select on public.users from anon;

-- B. shift_descendant_generations and transfer_admin_role are only ever
-- invoked via svc.rpc(...) using the service-role client from trusted Edge
-- Functions (review-relationship-change and transfer-admin respectively).
-- They already can't be abused by the `authenticated` role directly since
-- that role has no write grant on public.persons, but make the intent
-- explicit rather than incidental by revoking the default PUBLIC execute
-- grant that Postgres attaches to newly created functions.
--
-- NB: PUBLIC is an implicit member of every role, including service_role,
-- and service_role has no other standing EXECUTE grant on these functions
-- (unlike table access, which is granted to service_role explicitly in the
-- migrations that create each table). Revoking from PUBLIC alone would also
-- strip service_role's ability to call them, breaking the very Edge
-- Functions this hardening is meant to protect. So re-grant EXECUTE to
-- service_role explicitly right after revoking the blanket PUBLIC grant.
revoke execute on function public.shift_descendant_generations(uuid, integer) from public;
revoke execute on function public.transfer_admin_role(uuid, uuid) from public;
grant execute on function public.shift_descendant_generations(uuid, integer) to service_role;
grant execute on function public.transfer_admin_role(uuid, uuid) to service_role;

-- C. Schema-level backstop for the "at most one admin per clan" invariant
-- already enforced by application code (transfer-admin, clan-admin-settings,
-- leave-clan). Safe with transfer_admin_role: that function demotes the
-- caller to 'member' in one UPDATE statement and only then promotes the
-- target to 'admin' in a second UPDATE statement. Non-deferrable unique
-- indexes are checked at the end of each statement (not at end of
-- transaction), and the two UPDATEs run sequentially within the same
-- function invocation, so the demote is fully applied and visible before
-- the promote's constraint check runs. There is therefore never a moment,
-- even mid-transaction, where two rows for the same clan_id both hold
-- role = 'admin'.
create unique index persons_one_admin_per_clan
  on public.persons (clan_id)
  where role = 'admin';

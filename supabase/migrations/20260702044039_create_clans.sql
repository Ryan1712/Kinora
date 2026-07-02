create table public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_type text not null check (branch_type in ('noi', 'ngoai', 'khac')),
  invite_permission text not null default 'admin_only'
    check (invite_permission in ('admin_only', 'all_members')),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.clans enable row level security;
-- No policies yet: table is deny-all for anon/authenticated until Task 5 adds the
-- membership-based SELECT policy (requires public.persons to exist first).
-- All writes to this table happen exclusively via Edge Functions (service_role),
-- so no INSERT/UPDATE/DELETE policy is ever added for authenticated users.

grant select, insert, update, delete on public.clans to service_role;

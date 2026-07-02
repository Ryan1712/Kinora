create table public.persons (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id),
  full_name text not null,
  gender text check (gender in ('male', 'female', 'unknown')) default 'unknown',
  dob date,
  generation_number integer not null,
  linked_user_id uuid references public.users(id),
  role text check (role in ('admin', 'deputy', 'member')),
  created_at timestamptz not null default now()
);

create unique index persons_one_active_link_per_user_per_clan
  on public.persons (clan_id, linked_user_id)
  where linked_user_id is not null;

alter table public.persons enable row level security;

create or replace function public.is_clan_member(p_clan_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.persons
    where clan_id = p_clan_id
      and linked_user_id = auth.uid()
      and role is not null
  );
$$;

create or replace function public.is_clan_admin_or_deputy(p_clan_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.persons
    where clan_id = p_clan_id
      and linked_user_id = auth.uid()
      and role in ('admin', 'deputy')
  );
$$;

create policy persons_select_members on public.persons
for select using (public.is_clan_member(clan_id));
-- No insert/update/delete policy: all writes go through Edge Functions (service_role).

create policy clans_select_members on public.clans
for select using (public.is_clan_member(id));

grant select, insert, update, delete on public.persons to service_role;
grant select on public.persons to authenticated;
grant select on public.clans to authenticated;

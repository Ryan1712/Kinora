create table public.relationship_change_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id),
  person_id uuid not null references public.persons(id),
  proposed_relationship_type text not null check (proposed_relationship_type in ('parent_child', 'spouse')),
  proposed_relationship_with_person_id uuid not null references public.persons(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_person_id uuid references public.persons(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.relationship_change_requests enable row level security;

create policy rcr_select_requester_or_reviewer on public.relationship_change_requests
for select using (
  exists (
    select 1 from public.persons
    where persons.id = relationship_change_requests.person_id
      and persons.linked_user_id = auth.uid()
  )
  or public.is_clan_admin_or_deputy(clan_id)
);
-- No insert/update/delete policy: all writes go through Edge Functions.

grant select on public.relationship_change_requests to authenticated;
grant select, insert, update, delete on public.relationship_change_requests to service_role;

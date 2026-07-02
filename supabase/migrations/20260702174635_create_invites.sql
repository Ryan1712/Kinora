create table public.invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id),
  invited_by_person_id uuid not null references public.persons(id),
  invitee_user_id uuid references public.users(id),
  invitee_phone_or_email text,
  proposed_relationship_type text not null,
  proposed_relationship_with_person_id uuid not null references public.persons(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (invitee_user_id is not null or invitee_phone_or_email is not null)
);

create unique index invites_one_pending_per_user
  on public.invites (clan_id, invitee_user_id)
  where status = 'pending' and invitee_user_id is not null;

create unique index invites_one_pending_per_contact
  on public.invites (clan_id, invitee_phone_or_email)
  where status = 'pending' and invitee_user_id is null;

alter table public.invites enable row level security;

create policy invites_select_inviter_or_invitee on public.invites
for select using (
  invitee_user_id = auth.uid()
  or exists (
    select 1 from public.persons
    where persons.id = invites.invited_by_person_id
      and persons.linked_user_id = auth.uid()
  )
);
-- No insert/update/delete policy: all writes go through Edge Functions.

grant select on public.invites to authenticated;
grant select, insert, update, delete on public.invites to service_role;

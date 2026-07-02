create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id),
  from_person_id uuid not null references public.persons(id),
  to_person_id uuid not null references public.persons(id),
  type text not null check (type in ('parent_child', 'spouse')),
  created_at timestamptz not null default now(),
  check (from_person_id <> to_person_id)
);

create unique index relationships_no_duplicate_parent
  on public.relationships (to_person_id)
  where type = 'parent_child';
-- one parent_child edge per child column occurrence; a person can still have
-- two parents because each parent inserts a separate row with a different
-- from_person_id but the SAME to_person_id would collide — so this index
-- intentionally limits Stage 1 to one recorded parent per person. See
-- Global Constraints note below.

alter table public.relationships enable row level security;

create policy relationships_select_members on public.relationships
for select using (public.is_clan_member(clan_id));
-- No insert/update/delete policy: all writes go through Edge Functions.

grant select on public.relationships to authenticated;
grant select, insert, update, delete on public.relationships to service_role;

create or replace function public.would_create_cycle(p_parent_id uuid, p_child_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  with recursive descendants as (
    select to_person_id as person_id
    from public.relationships
    where from_person_id = p_child_id and type = 'parent_child'
    union
    select r.to_person_id
    from public.relationships r
    join descendants d on r.from_person_id = d.person_id
    where r.type = 'parent_child'
  )
  select p_parent_id = p_child_id or exists (select 1 from descendants where person_id = p_parent_id);
$$;

create or replace function public.shift_descendant_generations(p_person_id uuid, p_delta integer)
returns void
language plpgsql
set search_path = public
as $$
begin
  with recursive descendants as (
    select to_person_id as person_id
    from public.relationships
    where from_person_id = p_person_id and type = 'parent_child'
    union
    select r.to_person_id
    from public.relationships r
    join descendants d on r.from_person_id = d.person_id
    where r.type = 'parent_child'
  )
  update public.persons
  set generation_number = generation_number + p_delta
  where id in (select person_id from descendants);
end;
$$;

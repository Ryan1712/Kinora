drop index if exists public.relationships_no_duplicate_parent;

create or replace function public.validate_parent_child_relationship()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_gender text;
  parent_clan_id uuid;
  child_clan_id uuid;
  existing_parent_count integer;
begin
  if new.type <> 'parent_child' then
    return new;
  end if;

  select clan_id, gender
    into parent_clan_id, parent_gender
  from public.persons
  where id = new.from_person_id;

  select clan_id
    into child_clan_id
  from public.persons
  where id = new.to_person_id;

  if parent_clan_id is null or child_clan_id is null then
    raise exception 'parent_child relationships require existing persons'
      using errcode = '23514';
  end if;

  if parent_clan_id <> new.clan_id or child_clan_id <> new.clan_id then
    raise exception 'parent_child relationships must stay inside one clan'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.relationships r
    where r.type = 'parent_child'
      and r.from_person_id = new.from_person_id
      and r.to_person_id = new.to_person_id
      and r.id <> new.id
  ) then
    raise exception 'duplicate parent_child relationship'
      using errcode = '23505';
  end if;

  select count(*)
    into existing_parent_count
  from public.relationships r
  where r.type = 'parent_child'
    and r.to_person_id = new.to_person_id
    and r.id <> new.id;

  if existing_parent_count >= 2 then
    raise exception 'a person can have at most two recorded parents'
      using errcode = '23514';
  end if;

  if parent_gender in ('male', 'female') and exists (
    select 1
    from public.relationships r
    join public.persons p on p.id = r.from_person_id
    where r.type = 'parent_child'
      and r.to_person_id = new.to_person_id
      and r.id <> new.id
      and p.gender = parent_gender
  ) then
    raise exception 'a person already has a recorded parent with this gender'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_parent_child_relationship_before_write on public.relationships;

create trigger validate_parent_child_relationship_before_write
before insert or update of clan_id, from_person_id, to_person_id, type
on public.relationships
for each row
execute function public.validate_parent_child_relationship();

grant execute on function public.validate_parent_child_relationship() to service_role;
revoke execute on function public.validate_parent_child_relationship() from public;

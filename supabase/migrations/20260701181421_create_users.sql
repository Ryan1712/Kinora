create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  phone text,
  email text,
  occupation text,
  address text,
  dob date,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    select exists(select 1 from public.users where invite_code = candidate) into exists_already;
    exit when not exists_already;
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

create trigger users_set_invite_code
before insert on public.users
for each row execute function public.set_invite_code();

alter table public.users enable row level security;

create policy users_select_own on public.users
for select using (auth.uid() = id);

create policy users_insert_own on public.users
for insert with check (auth.uid() = id);

create policy users_update_own on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.users to service_role;
grant select on public.users to anon;

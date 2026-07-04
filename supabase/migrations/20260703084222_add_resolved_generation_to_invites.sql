alter table public.invites
  add column resolved_generation integer not null default 0;

alter table public.invites alter column resolved_generation drop default;

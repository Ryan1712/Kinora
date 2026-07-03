alter table public.invites
  add column invitee_full_name text not null default '',
  add column invitee_gender text check (invitee_gender in ('male', 'female', 'unknown')) default 'unknown';

alter table public.invites alter column invitee_full_name drop default;

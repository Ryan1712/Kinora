-- Wraps the admin-role swap performed by the transfer-admin Edge Function in a
-- single transactional RPC so the two updates (demote caller, promote target)
-- either both succeed or both roll back. Prevents a race where the target
-- person is concurrently unlinked (role set to null, e.g. via
-- clan-admin-settings' remove_member) between the Edge Function's earlier
-- validation read and the actual update, which would otherwise leave the
-- clan with zero admins and no recovery path.
--
-- Not security definer: like would_create_cycle/shift_descendant_generations
-- (see 20260702164818_create_relationships.sql), this is only ever invoked
-- via svc.rpc(...) from the transfer-admin Edge Function using the
-- service-role client, which already bypasses RLS/grants entirely. No grant
-- escalation is needed.
create or replace function public.transfer_admin_role(p_caller_person_id uuid, p_target_person_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_updated_count integer;
begin
  update public.persons set role = 'member' where id = p_caller_person_id;

  update public.persons
  set role = 'admin'
  where id = p_target_person_id and role is not null;
  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'target person has no active role in this clan';
  end if;
end;
$$;

import { supabase } from '../lib/supabase';
import { ApiError, type InviteMemberParams } from './types';

export async function inviteMember(
  params: InviteMemberParams
): Promise<{ invite_id: string; resolved_generation: number }> {
  const { data, error } = await supabase.functions.invoke('invite-member', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

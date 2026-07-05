import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function respondInvite(params: {
  invite_id: string;
  action: 'accept' | 'decline';
}): Promise<{ person_id?: string }> {
  const { data, error } = await supabase.functions.invoke('respond-invite', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function leaveClan(params: { clan_id: string }): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('leave-clan', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

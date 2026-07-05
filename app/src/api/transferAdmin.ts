import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function transferAdmin(params: {
  clan_id: string;
  new_admin_person_id: string;
  password: string;
}): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('transfer-admin', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

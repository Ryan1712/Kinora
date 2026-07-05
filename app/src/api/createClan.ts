import { supabase } from '../lib/supabase';
import { ApiError, type CreateClanParams } from './types';

export async function createClan(
  params: CreateClanParams
): Promise<{ clan_id: string; person_id: string }> {
  const { data, error } = await supabase.functions.invoke('create-clan', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

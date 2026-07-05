import { supabase } from '../lib/supabase';
import { ApiError, type ClanAdminSettingsParams } from './types';

export async function clanAdminSettings(
  params: ClanAdminSettingsParams
): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('clan-admin-settings', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}

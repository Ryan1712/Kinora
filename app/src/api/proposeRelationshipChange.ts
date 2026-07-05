import { supabase } from '../lib/supabase';
import { ApiError, type ProposeChangeParams } from './types';

export async function proposeRelationshipChange(
  params: ProposeChangeParams
): Promise<{ request_id: string }> {
  const { data, error } = await supabase.functions.invoke('propose-relationship-change', {
    body: params,
  });
  if (error) throw new ApiError(error.message);
  return data;
}

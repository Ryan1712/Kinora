import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function reviewRelationshipChange(params: {
  request_id: string;
  action: 'approve' | 'reject';
}): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('review-relationship-change', {
    body: params,
  });
  if (error) throw new ApiError(error.message);
  return data;
}

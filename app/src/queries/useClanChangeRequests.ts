import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';

export interface ChangeRequestRow {
  id: string;
  proposed_relationship_type: 'parent_child' | 'spouse' | string;
  persons: { full_name: string };
}

export function useClanChangeRequests(clanId: string) {
  return useQuery({
    queryKey: ['clan-requests', clanId],
    queryFn: async (): Promise<ChangeRequestRow[]> => {
      const { data, error } = await supabase
        .from('relationship_change_requests')
        .select(
          'id, proposed_relationship_type, persons!relationship_change_requests_person_id_fkey(full_name)'
        )
        .eq('clan_id', clanId)
        .eq('status', 'pending');

      if (error) throw error;
      return data as unknown as ChangeRequestRow[];
    },
    enabled: Boolean(clanId),
  });
}

import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';

export interface MemberRow {
  id: string;
  full_name: string;
  gender: string;
  generation_number: number;
  role: string | null;
  linked_user_id: string | null;
}

export function useClanMembers(clanId: string) {
  return useQuery({
    queryKey: ['clan-members', clanId],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('persons')
        .select('id, full_name, gender, generation_number, role, linked_user_id')
        .eq('clan_id', clanId)
        .order('generation_number');

      if (error) throw error;
      return data as MemberRow[];
    },
    enabled: !!clanId,
  });
}

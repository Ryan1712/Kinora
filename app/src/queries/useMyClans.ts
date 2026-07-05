import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface MyClanRow {
  role: string;
  clan_id: string;
  clans: { id: string; name: string; branch_type: string };
}

export function useMyClans() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-clans', session?.user.id],
    queryFn: async (): Promise<MyClanRow[]> => {
      const { data, error } = await supabase
        .from('persons')
        .select('role, clan_id, clans(id, name, branch_type)')
        .eq('linked_user_id', session!.user.id);

      if (error) throw error;
      return data as unknown as MyClanRow[];
    },
    enabled: !!session,
  });
}

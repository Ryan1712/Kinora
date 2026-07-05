import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface InviteRow {
  id: string;
  clan_id: string;
  invitee_full_name: string;
  proposed_relationship_type: string;
  clans: { name: string };
}

export function useMyInvites() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-invites', session?.user.id],
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from('invites')
        .select('id, clan_id, invitee_full_name, proposed_relationship_type, clans(name)')
        .eq('invitee_user_id', session!.user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data as unknown as InviteRow[];
    },
    enabled: !!session,
  });
}

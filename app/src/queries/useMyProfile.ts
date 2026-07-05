import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  invite_code: string;
}

export function useMyProfile() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-profile', session?.user.id],
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, email, occupation, address, invite_code')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;
      return data as ProfileRow;
    },
    enabled: !!session,
  });
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'occupation' | 'address'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw error;
}

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { clanAdminSettings } from '@/api/clanAdminSettings';
import { useAuth } from '@/lib/AuthContext';
import { useClanMembers } from '@/queries/useClanMembers';
import MemberDetailScreen from '../[personId]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1', personId: 'p2' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/queries/useClanMembers');
jest.mock('@/lib/AuthContext', () => ({ useAuth: jest.fn() }), { virtual: true });
jest.mock('@/api/clanAdminSettings', () => ({ clanAdminSettings: jest.fn() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('MemberDetailScreen', () => {
  it('shows an appoint deputy action for an admin viewing a plain member', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'admin-user' } } });
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [
        {
          id: 'p1',
          full_name: 'Admin',
          gender: 'male',
          generation_number: 15,
          role: 'admin',
          linked_user_id: 'admin-user',
        },
        {
          id: 'p2',
          full_name: 'Member',
          gender: 'male',
          generation_number: 16,
          role: 'member',
          linked_user_id: 'member-user',
        },
      ],
    });
    (clanAdminSettings as jest.Mock).mockResolvedValue({});

    await render(<MemberDetailScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(screen.getByText('Bổ nhiệm phó tộc trưởng'));
    });

    await waitFor(() => {
      expect(clanAdminSettings).toHaveBeenCalledWith({
        clan_id: 'c1',
        action: 'appoint_deputy',
        person_id: 'p2',
      });
    });
  });
});

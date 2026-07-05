import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { proposeRelationshipChange } from '../../../../../api/proposeRelationshipChange';
import ProposeChangeScreen from '../propose-change';
import { useAuth } from '../../../../../lib/AuthContext';
import { useClanMembers } from '../../../../../queries/useClanMembers';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock('../../../../../lib/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../../../queries/useClanMembers', () => ({ useClanMembers: jest.fn() }));
jest.mock('../../../../../api/proposeRelationshipChange', () => ({
  proposeRelationshipChange: jest.fn(),
}));

describe('ProposeChangeScreen', () => {
  it('submits the selected target and type', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } } });
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [
        { id: 'p1', full_name: 'Me', linked_user_id: 'u1' },
        { id: 'p2', full_name: 'Bac Ba', linked_user_id: null },
      ],
    });
    (proposeRelationshipChange as jest.Mock).mockResolvedValue({ request_id: 'r1' });

    const { getByText } = await render(<ProposeChangeScreen />);
    await fireEvent.press(getByText('Bac Ba'));
    await fireEvent.press(getByText('Gửi đề xuất'));

    await waitFor(() => {
      expect(proposeRelationshipChange).toHaveBeenCalledWith({
        clan_id: 'c1',
        proposed_relationship_type: 'parent_child',
        proposed_relationship_with_person_id: 'p2',
      });
    });
  });
});



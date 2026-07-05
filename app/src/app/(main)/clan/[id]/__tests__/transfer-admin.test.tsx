import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { transferAdmin } from '../../../../../api/transferAdmin';
import TransferAdminScreen from '../transfer-admin';
import { useClanMembers } from '../../../../../queries/useClanMembers';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('../../../../../queries/useClanMembers', () => ({ useClanMembers: jest.fn() }));
jest.mock('../../../../../api/transferAdmin', () => ({ transferAdmin: jest.fn() }));

describe('TransferAdminScreen', () => {
  it('submits the target and password', async () => {
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [
        { id: 'p1', full_name: 'Me', role: 'admin' },
        { id: 'p2', full_name: 'Toan', role: 'member' },
      ],
    });
    (transferAdmin as jest.Mock).mockResolvedValue({});

    const { getByTestId, getByText } = await render(<TransferAdminScreen />);
    await fireEvent.press(getByText('Toan'));
    await fireEvent.changeText(getByTestId('password-input'), 'password123');
    await fireEvent.press(getByText('Xác nhận nhường quyền'));

    await waitFor(() => {
      expect(transferAdmin).toHaveBeenCalledWith({
        clan_id: 'c1',
        new_admin_person_id: 'p2',
        password: 'password123',
      });
    });
  });
});



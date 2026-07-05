import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { clanAdminSettings } from '../../../../../api/clanAdminSettings';
import SettingsScreen from '../settings';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../../../../api/clanAdminSettings', () => ({ clanAdminSettings: jest.fn() }));

describe('SettingsScreen', () => {
  it('submits the new name and invite permission', async () => {
    (clanAdminSettings as jest.Mock).mockResolvedValue({});

    const { getByTestId, getByText } = await render(<SettingsScreen />);
    await fireEvent.changeText(getByTestId('clan-name-input'), 'Ho Pham Moi');
    await fireEvent.press(getByText('Mọi thành viên'));
    await fireEvent.press(getByText('Lưu cài đặt'));

    await waitFor(() => {
      expect(clanAdminSettings).toHaveBeenCalledWith({
        clan_id: 'c1',
        action: 'update_settings',
        name: 'Ho Pham Moi',
        invite_permission: 'all_members',
      });
    });
  });
});



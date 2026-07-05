import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { createClan } from '@/api/createClan';
import CreateClanScreen from '../create-clan';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/api/createClan', () => ({ createClan: jest.fn() }));

describe('CreateClanScreen', () => {
  it('submits the form fields to createClan', async () => {
    (createClan as jest.Mock).mockResolvedValue({ clan_id: 'c1', person_id: 'p1' });

    const { getByTestId, getByText } = await render(<CreateClanScreen />);
    await fireEvent.changeText(getByTestId('clan-name-input'), 'Ho Pham');
    await fireEvent.changeText(getByTestId('admin-name-input'), 'Duy');
    await fireEvent.changeText(getByTestId('generation-input'), '15');
    await fireEvent.press(getByText('Tạo gia tộc'));

    await waitFor(() => {
      expect(createClan).toHaveBeenCalledWith({
        name: 'Ho Pham',
        branch_type: 'noi',
        admin_full_name: 'Duy',
        admin_generation_number: 15,
      });
    });
  });
});



import React from 'react';
import { render } from '@testing-library/react-native';
import { MemberAvatar } from '../MemberAvatar';

describe('MemberAvatar', () => {
  it('shows the initials of the first and last name', async () => {
    const { getByText } = await render(<MemberAvatar fullName="Phạm Văn Duy" />);
    expect(getByText('PD')).toBeTruthy();
  });

  it('falls back to a single initial for a one-word name', async () => {
    const { getByText } = await render(<MemberAvatar fullName="Duy" />);
    expect(getByText('D')).toBeTruthy();
  });
});

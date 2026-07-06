import React from 'react';
import { render } from '@testing-library/react-native';
import { RoleBadge } from '../RoleBadge';

describe('RoleBadge', () => {
  it('renders the Vietnamese label for admin', async () => {
    const { getByText } = await render(<RoleBadge role="admin" />);
    expect(getByText('TRƯỞNG HỌ')).toBeTruthy();
  });

  it('renders the Vietnamese label for deputy', async () => {
    const { getByText } = await render(<RoleBadge role="deputy" />);
    expect(getByText('PHÓ TỘC TRƯỞNG')).toBeTruthy();
  });

  it('renders the Vietnamese label for member', async () => {
    const { getByText } = await render(<RoleBadge role="member" />);
    expect(getByText('THÀNH VIÊN')).toBeTruthy();
  });

  it('renders nothing when role is null', async () => {
    const { toJSON } = await render(<RoleBadge role={null} />);
    expect(toJSON()).toBeNull();
  });
});

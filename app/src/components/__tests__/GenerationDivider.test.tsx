import React from 'react';
import { render } from '@testing-library/react-native';
import { GenerationDivider } from '../GenerationDivider';

describe('GenerationDivider', () => {
  it('renders the generation label in Vietnamese', async () => {
    const { getByText } = await render(<GenerationDivider generation={15} />);
    expect(getByText('ĐỜI 15')).toBeTruthy();
  });
});

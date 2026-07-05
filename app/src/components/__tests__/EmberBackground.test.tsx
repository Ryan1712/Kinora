import React from 'react';
import { render } from '@testing-library/react-native';
import { EmberBackground } from '../EmberBackground';

describe('EmberBackground', () => {
  it('renders a fixed number of ember particles', async () => {
    const { getAllByTestId } = await render(<EmberBackground />);
    expect(getAllByTestId('ember-particle')).toHaveLength(10);
  });
});

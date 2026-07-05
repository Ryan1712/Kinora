import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { brand } from './brand';

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.gold.mid,
    onPrimary: '#2b1a12',
    secondary: brand.gold.dark,
    error: brand.red,
    background: '#faf3e8',
    surface: '#ffffff',
    onSurface: '#2b1a12',
    outline: '#d8c7a8',
  },
  roundness: 14,
};

import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { brand } from './brand';

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.gold.mid,
    onPrimary: brand.text.onGold,
    secondary: brand.gold.dark,
    error: brand.red,
    background: '#180d08',
    surface: '#2b1a12',
    onSurface: brand.text.body,
    onBackground: brand.text.body,
    outline: brand.glass.border,
  },
  roundness: 14,
};

import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const colors = {
  brand: {
    1000: '#00184D',
    900: '#002982',
    800: '#003EC1',
    700: '#004BEB',
    600: '#0052FF',
    500: '#105EFF',
    400: '#266EFF',
    300: '#4684FF',
    200: '#73A2FF',
    150: '#92B6FF',
    100: '#B0CAFF',
    50: '#D3E1FF',
    0: '#F5F8FF',
  },
};

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

export const theme = extendTheme({
  colors,
  config,
});

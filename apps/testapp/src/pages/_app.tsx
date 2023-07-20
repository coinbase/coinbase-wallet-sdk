// 1. import `ChakraProvider` component
import { ChakraProvider } from '@chakra-ui/react';
import * as React from 'react';

import { Layout } from '../components/Layout';
import { CBWSDKProvider } from '../context/CBWSDKProvider';
import { theme } from '../theme';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <CBWSDKProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </CBWSDKProvider>
    </ChakraProvider>
  );
}

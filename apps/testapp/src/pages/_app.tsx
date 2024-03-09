// 1. import `ChakraProvider` component
import { ChakraProvider } from '@chakra-ui/react';
import * as React from 'react';

import { Layout } from '../components/Layout';
import { CBWSDKReactContextProvider } from '../context/CBWSDKReactContextProvider';
import { theme } from '../theme';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <CBWSDKReactContextProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </CBWSDKReactContextProvider>
    </ChakraProvider>
  );
}

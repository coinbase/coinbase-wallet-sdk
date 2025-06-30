// 1. import `ChakraProvider` component
import { ChakraProvider } from '@chakra-ui/react';
import { PrivyProvider } from '@privy-io/react-auth';
import * as React from 'react';

import { Layout } from '../components/Layout';
import { CBWSDKReactContextProvider } from '../context/CBWSDKReactContextProvider';
import { theme } from '../theme';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <PrivyProvider appId={'cm6regwin00ohsufbwwrdpq25'}>
        <CBWSDKReactContextProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </CBWSDKReactContextProvider>
      </PrivyProvider>
    </ChakraProvider>
  );
}

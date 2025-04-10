import { ChakraProvider } from '@chakra-ui/react';

import { Layout } from '../components/Layout';
import { ConfigContextProvider } from '../context/ConfigContextProvider';
import { EIP1193ProviderContextProvider } from '../context/EIP1193ProviderContextProvider';
import { systemStorageManager, theme } from '../theme';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme} colorModeManager={systemStorageManager}>
      <ConfigContextProvider>
        <EIP1193ProviderContextProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </EIP1193ProviderContextProvider>
      </ConfigContextProvider>
    </ChakraProvider>
  );
}

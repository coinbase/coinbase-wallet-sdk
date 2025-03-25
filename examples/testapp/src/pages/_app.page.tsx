import { ChakraProvider } from '@chakra-ui/react';

import { Layout } from '../components/Layout';
import { ConfigParamsContextProvider } from '../context/ConfigParamsContextProvider';
import { EIP1193ProviderContextProvider } from '../context/EIP1193ProviderContextProvider';
import { systemStorageManager, theme } from '../theme';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme} colorModeManager={systemStorageManager}>
      <ConfigParamsContextProvider>
        <EIP1193ProviderContextProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </EIP1193ProviderContextProvider>
      </ConfigParamsContextProvider>
    </ChakraProvider>
  );
}

import { ChakraProvider } from '@chakra-ui/react';

import { Layout } from '../components/Layout';
import { ConfigContextProvider } from '../context/ConfigContextProvider';
import { EIP1193ProviderContextProvider } from '../context/EIP1193ProviderContextProvider';
import { systemStorageManager, theme } from '../theme';

export default function App({ Component, pageProps }) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);

  return (
    <ChakraProvider theme={theme} colorModeManager={systemStorageManager}>
      <ConfigContextProvider>
        <EIP1193ProviderContextProvider>
          {getLayout(<Component {...pageProps} />)}
        </EIP1193ProviderContextProvider>
      </ConfigContextProvider>
    </ChakraProvider>
  );
}

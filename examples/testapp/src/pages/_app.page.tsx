import { ChakraProvider } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Layout } from '../components/Layout';
import { ConfigContextProvider } from '../context/ConfigContextProvider';
import { EIP1193ProviderContextProvider } from '../context/EIP1193ProviderContextProvider';
import { systemStorageManager, theme } from '../theme';

export default function App({ Component, pageProps }) {
  const { basePath } = useRouter();
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);

  return (
    <ChakraProvider theme={theme} colorModeManager={systemStorageManager}>
      <Head>
        {/* Next doesn't add basePath to <link> hrefs, and _document has no router to read it from */}
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="16x16 32x32 48x48 256x256" />
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
      </Head>
      <ConfigContextProvider>
        <EIP1193ProviderContextProvider>
          {getLayout(<Component {...pageProps} />)}
        </EIP1193ProviderContextProvider>
      </ConfigContextProvider>
    </ChakraProvider>
  );
}

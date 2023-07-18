import { Button, Container } from '@chakra-ui/react';
import { CoinbaseWalletProvider, CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useEffect } from 'react';

export default function Home() {
  const [_, setSdk] = React.useState<CoinbaseWalletSDK | null>(null);
  const [provider, setProvider] = React.useState<CoinbaseWalletProvider | null>(null);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'Test App',
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider('http');
    console.info('provider', cbwprovider);
    setProvider(cbwprovider);
  }, []);

  const connect = useCallback(async () => {
    if (!provider) return;
    try {
      await provider.enable();
    } catch (error) {
      console.error(error);
    }
  }, [provider]);

  return (
    <Container maxW="container.xl">
      <Button mt={4} onClick={connect}>
        Connect
      </Button>
    </Container>
  );
}

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
    <div>
      <h1>Connect</h1>
      <button onClick={connect}>Connect</button>
    </div>
  );
}

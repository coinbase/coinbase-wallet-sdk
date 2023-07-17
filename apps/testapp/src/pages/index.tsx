import { CoinbaseWalletProvider, CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useEffect } from 'react';

export default function Home() {
  const [sdk, setSdk] = React.useState<CoinbaseWalletSDK | null>(null);
  const [_, setProvider] = React.useState<CoinbaseWalletProvider | null>(null);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'Test App',
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider('');
    console.info('provider', cbwprovider);
    setProvider(cbwprovider);
  }, []);

  return (
    <div>
      <h1>SDK</h1>
      <pre>{JSON.stringify(sdk, null, 2)}</pre>
      <h1>Provider</h1>
    </div>
  );
}

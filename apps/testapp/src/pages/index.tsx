import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const sdk = new CoinbaseWalletSDK({
      appName: 'Test App',
    });
    console.log('sdk', sdk);
  }, []);
  return (
    <div>
      <h1>Home</h1>
    </div>
  );
}

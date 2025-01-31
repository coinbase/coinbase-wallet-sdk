import { Container, VStack } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useEffect, useState } from 'react';

import { AddAddress } from './components/AddAddress';
import { Connect } from './components/Connect';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';

export default function SubAccounts() {
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();

  useEffect(() => {
    const sdk = createCoinbaseWalletSDK({
      appName: 'CryptoPlayground',
      preference: {
        keysUrl: 'http://localhost:3005/connect',
        options: 'smartWalletOnly',
      },
    });

    if (!sdk) {
      return;
    }

    setSDK(sdk);
    const provider = sdk.getProvider();

    provider.on('accountsChanged', (accounts) => {
      console.info('customlogs: accountsChanged', accounts);
    });
  }, []);

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        <Connect sdk={sdk} />
        <AddAddress sdk={sdk} />
        <PersonalSign sdk={sdk} />
        <SendCalls sdk={sdk} />
      </VStack>
    </Container>
  );
}

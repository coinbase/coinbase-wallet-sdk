import { Container, VStack } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useEffect, useState } from 'react';

import { AddOwner } from './components/AddOwner';
import { AddSubAccount } from './components/AddSubAccount';
import { Connect } from './components/Connect';
import { GenerateNewSigner } from './components/GenerateNewSigner';
import { GrantSpendPermission } from './components/GrantSpendPermission';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';
import { SpendPermissions } from './components/SpendPermissions';

export default function SubAccounts() {
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();
  const [subAccountAddress, setSubAccountAddress] = useState<string>();

  useEffect(() => {
    const sdk = createCoinbaseWalletSDK({
      appName: 'CryptoPlayground',
      preference: {
        keysUrl: 'http://localhost:3005/connect',
        options: 'smartWalletOnly',
      },
      subaccount: {
        getSigner: getCryptoKeyAccount,
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
        <AddSubAccount sdk={sdk} onAddSubAccount={setSubAccountAddress} />
        <PersonalSign sdk={sdk} subAccountAddress={subAccountAddress} />
        <SendCalls sdk={sdk} subAccountAddress={subAccountAddress} />
        <GrantSpendPermission sdk={sdk} subAccountAddress={subAccountAddress} />
        <SpendPermissions sdk={sdk} subAccountAddress={subAccountAddress} />
        <GenerateNewSigner />
        <AddOwner sdk={sdk} />
      </VStack>
    </Container>
  );
}

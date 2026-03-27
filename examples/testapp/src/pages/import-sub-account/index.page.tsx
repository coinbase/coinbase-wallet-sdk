import { Container, VStack } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useEffect, useState } from 'react';
import { Client, Hex, createPublicClient, http } from 'viem';
import { SmartAccount, toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { unsafe_generateOrLoadPrivateKey } from '../../utils/unsafe_generateOrLoadPrivateKey';
import { AddGlobalOwner } from './components/AddGlobalOwner';
import { AddSubAccountDeployed } from './components/AddSubAccountDeployed';
import { AddSubAccountUndeployed } from './components/AddSubAccountUndeployed';
import { Connect } from './components/Connect';
import { DeploySubAccount } from './components/DeploySubAccount';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';

export default function SubAccounts() {
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();
  const [subAccount, setSubAccount] = useState<SmartAccount>();
  const [deployed, setDeployed] = useState<boolean>(false);

  async function getSubAccount(pk: Hex) {
    const account = privateKeyToAccount(pk);
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    const smartAccount = await toCoinbaseSmartAccount({
      client: client as Client,
      owners: [account],
    });
    return smartAccount;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: no dep
  useEffect(() => {
    // THIS IS NOT SAFE, THIS IS ONLY FOR TESTING
    // IN A REAL APP YOU SHOULD NOT STORE/EXPOSE A PRIVATE KEY
    const pk = unsafe_generateOrLoadPrivateKey();
    const account = privateKeyToAccount(pk);

    const sdk = createCoinbaseWalletSDK({
      appName: 'CryptoPlayground',
      preference: {
        keysUrl: 'http://localhost:3005/connect',
        options: 'smartWalletOnly',
      },
      subAccounts: {
        toOwnerAccount: () => Promise.resolve({ account }),
      },
    });

    if (!sdk) {
      return;
    }

    (async () => {
      const sa = await getSubAccount(pk);

      const isDeployed = await sa.isDeployed();
      setDeployed(isDeployed);
      setSubAccount(sa);
    })();

    setSDK(sdk);
    const provider = sdk.getProvider();

    provider.on('accountsChanged', (accounts) => {
      console.info('accountsChanged', accounts);
    });
  }, []);

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        <Connect sdk={sdk} />
        {deployed ? (
          <>
            <AddSubAccountDeployed sdk={sdk} subAccount={subAccount} />
            <AddGlobalOwner sdk={sdk} subAccount={subAccount} />
            <PersonalSign sdk={sdk} subAccountAddress={subAccount?.address} />
            <SendCalls sdk={sdk} subAccount={subAccount} />
          </>
        ) : (
          <>
            <DeploySubAccount sdk={sdk} subAccount={subAccount} />
            <AddSubAccountUndeployed sdk={sdk} subAccount={subAccount} />
          </>
        )}
      </VStack>
    </Container>
  );
}

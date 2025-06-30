import { Container, VStack } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import React, { useEffect, useState } from 'react';
import { createWalletClient, custom, Hex } from 'viem';
import { toAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { AddAddress } from './components/AddAddress';
import { Connect } from './components/Connect';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';
export default function SubAccounts() {
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();
  const { login, ready, user } = usePrivy();

  const { wallets } = useWallets();

  /*useEffect(() => {
    const sdk = createCoinbaseWalletSDK({
      appName: 'CryptoPlayground',
      preference: {
        keysUrl: 'http://localhost:3005/connect',
        options: 'smartWalletOnly',
      },
      subaccount: {
        getSigner: getCryptoKeyAccount as any,
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
  }, []);*/
  console.log('customlogs: user', user, wallets);

  useEffect(() => {
    const f = async () => {
      if (ready && wallets && wallets.length == 1) {
       /* console.info('customlogs: wallets', wallets);
        // grab embedded wallet from state
        const wallet = wallets.find((w) => w.connectorType === 'embedded');
        if (!wallet) {
          console.error('No wallet found');
          return;
        }
        await wallet.switchChain(baseSepolia.id);
        const provider = await wallet.getEthereumProvider();
        const walletClient = createWalletClient({
          account: wallet.address as Hex,
          chain: baseSepolia,
          transport: custom(provider),
        });
        console.info('customlogs: walletClient', walletClient);
        const account = toAccount({
          address: wallet.address as Hex,
          async sign({ hash }) {
            return walletClient.signMessage({ message: hash, account: walletClient.account });
          },
          async signMessage({ message }) {
            return walletClient.signMessage({ message, account: walletClient.account });
          },
          async signTransaction(transaction) {
            return walletClient.signTransaction({
              transaction,
              account: walletClient.account,
              chain: baseSepolia,
            });
          },
          async signTypedData(typedData) {
            return walletClient.signTypedData({ typedData, account: walletClient.account });
          },
        });
        console.info('customlogs: account', account);*/

        // sdk logic

        const sdk = createCoinbaseWalletSDK({
          appName: 'CryptoPlayground',
          preference: {
            keysUrl: 'http://localhost:3005/connect',
            options: 'smartWalletOnly',
          },
          subaccount: {
            //getSigner: async () => account,
            getSigner: async () => {       
              const wallet = wallets.find((w) => w.connectorType === 'embedded');
              if (!wallet) {
                console.error('No wallet found');
                return;
              }
              await wallet.switchChain(baseSepolia.id);
              const provider = await wallet.getEthereumProvider();
              const walletClient = createWalletClient({
                account: wallet.address as Hex,
                chain: baseSepolia,
                transport: custom(provider),
              });
              console.info('customlogs: walletClient', walletClient);
              return toAccount({
                address: wallet.address as Hex,
                async sign({ hash }) {
                  return walletClient.signMessage({ message: hash, account: walletClient.account });
                },
                async signMessage({ message }) {
                  return walletClient.signMessage({ message, account: walletClient.account });
                },
                async signTransaction(transaction) {
                  return walletClient.signTransaction({
                    transaction,
                    account: walletClient.account,
                    chain: baseSepolia,
                  });
                },
                async signTypedData(typedData) {
                  return walletClient.signTypedData({ typedData, account: walletClient.account });
                },
              });
            },
          },
        });

        if (!sdk) {
          return;
        }

        setSDK(sdk);
        const provider2 = sdk.getProvider();

        provider2.on('accountsChanged', (accounts) => {
          console.info('customlogs: accountsChanged', accounts);
        });
      }
    };
    f();
  }, [wallets, ready]);

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        {wallets.length === 0 && <button onClick={() => login()}>Login</button>}
        <Connect sdk={sdk} />
        {wallets && wallets.length > 0 && (
          <div>Privy embedded wallet address: {wallets[0].address}</div>
        )}
        <AddAddress sdk={sdk} />
        <PersonalSign sdk={sdk} />
        <SendCalls sdk={sdk} />
      </VStack>
    </Container>
  );
}

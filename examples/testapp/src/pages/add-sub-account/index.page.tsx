import {
  Container,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import { useEffect, useState } from 'react';

import { mnemonicToAccount } from 'viem/accounts';
import { AddOwner } from './components/AddOwner';
import { AddSubAccount } from './components/AddSubAccount';
import { Connect } from './components/Connect';
import { GenerateNewSigner } from './components/GenerateNewSigner';
import { GrantSpendPermission } from './components/GrantSpendPermission';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';
import { SpendPermissions } from './components/SpendPermissions';

type SignerType = 'cryptokey' | 'secp256k1';

export default function SubAccounts() {
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();
  const [subAccountAddress, setSubAccountAddress] = useState<string>();
  const [signerType, setSignerType] = useState<SignerType>('cryptokey');
  const [getSubAccountSigner, setGetSubAccountSigner] = useState<typeof getCryptoKeyAccount>(
    () => getCryptoKeyAccount
  );

  useEffect(() => {
    const stored = localStorage.getItem('signer-type');
    if (stored !== null) {
      setSignerType(stored as SignerType);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('signer-type', signerType);
  }, [signerType]);

  useEffect(() => {
    const getSigner =
      signerType === 'cryptokey'
        ? getCryptoKeyAccount
        : async () => ({
            account: mnemonicToAccount(
              'test test test test test test test test test test test junk'
            ),
          });

    setGetSubAccountSigner(() => getSigner);
  }, [signerType]);

  useEffect(() => {
    const sdk = createCoinbaseWalletSDK({
      appName: 'CryptoPlayground',
      preference: {
        keysUrl: 'http://localhost:3005/connect',
        options: 'smartWalletOnly',
      },
      toSubAccountSigner: getSubAccountSigner,
    });

    setSDK(sdk);
    const provider = sdk.getProvider();

    provider.on('accountsChanged', (accounts) => {
      console.info('accountsChanged', accounts);
    });
  }, [getSubAccountSigner]);

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        <FormControl>
          <FormLabel>Select Signer Type</FormLabel>
          <RadioGroup value={signerType} onChange={(value: SignerType) => setSignerType(value)}>
            <Stack direction="row">
              <Radio value="cryptokey">CryptoKey</Radio>
              <Radio value="secp256k1">secp256k1</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <Connect sdk={sdk} />
        <AddSubAccount
          sdk={sdk}
          onAddSubAccount={setSubAccountAddress}
          signerFn={getSubAccountSigner}
        />
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

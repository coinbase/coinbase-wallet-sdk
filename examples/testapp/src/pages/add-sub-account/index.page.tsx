import {
  Container,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from '@chakra-ui/react';
import { getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import { useEffect, useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';

import { useConfig } from '../../context/ConfigContextProvider';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import { unsafe_generateOrLoadPrivateKey } from '../../utils/unsafe_generateOrLoadPrivateKey';
import { AddOwner } from './components/AddOwner';
import { AddSubAccount } from './components/AddSubAccount';
import { AddSubAccountWithoutKeys } from './components/AddSubAccountWithoutKeys';
import { Connect } from './components/Connect';
import { GenerateNewSigner } from './components/GenerateNewSigner';
import { GetSubAccounts } from './components/GetSubAccounts';
import { GrantSpendPermission } from './components/GrantSpendPermission';
import { PersonalSign } from './components/PersonalSign';
import { SendCalls } from './components/SendCalls';
import { SpendPermissions } from './components/SpendPermissions';

type SignerType = 'cryptokey' | 'secp256k1';

export default function SubAccounts() {
  const { sdk } = useEIP1193Provider();
  const { setSubAccountsConfig } = useConfig();
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
        : async () => {
            // THIS IS NOT SAFE, THIS IS ONLY FOR TESTING
            // IN A REAL APP YOU SHOULD NOT STORE/EXPOSE A PRIVATE KEY
            const privateKey = unsafe_generateOrLoadPrivateKey();
            return {
              account: privateKeyToAccount(privateKey),
            };
          };

    setGetSubAccountSigner(() => getSigner);
    setSubAccountsConfig({ toOwnerAccount: getSigner });
  }, [signerType, setSubAccountsConfig]);

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
        <GetSubAccounts sdk={sdk} />
        <AddSubAccountWithoutKeys
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

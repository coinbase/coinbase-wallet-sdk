import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from '@chakra-ui/react';
import { getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import { SpendLimitConfig } from '@coinbase/wallet-sdk/dist/core/provider/interface';
import React, { useEffect, useState } from 'react';
import { numberToHex, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { useConfig } from '../../context/ConfigContextProvider';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import { unsafe_generateOrLoadPrivateKey } from '../../utils/unsafe_generateOrLoadPrivateKey';

type SignerType = 'cryptokey' | 'secp256k1';

interface WalletConnectResponse {
  accounts: Array<{
    address: string;
    capabilities?: Record<string, unknown>;
  }>;
}

export default function AutoSubAccount() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<string>();
  const [sendingAmounts, setSendingAmounts] = useState<Record<number, boolean>>({});
  const [signerType, setSignerType] = useState<SignerType>('cryptokey');
  const { subAccountsConfig, setSubAccountsConfig, config, setConfig } = useConfig();
  const { provider } = useEIP1193Provider();

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

    setSubAccountsConfig((prev) => ({ ...prev, toOwnerAccount: getSigner }));
  }, [signerType, setSubAccountsConfig]);

  const handleRequestAccounts = async () => {
    if (!provider) return;

    try {
      const response = await provider.request({
        method: 'eth_requestAccounts',
        params: [],
      });
      setAccounts(response as string[]);
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleSendTransaction = async () => {
    if (!provider || !accounts.length) return;

    try {
      const response = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            value: '0x0',
            data: '0x',
          },
        ],
      });
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleSignTypedData = async () => {
    if (!provider || !accounts.length) return;

    try {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
        },
        primaryType: 'Person',
        domain: {
          name: 'Test Domain',
          version: '1',
          chainId: baseSepolia.id,
          verifyingContract: '0x0000000000000000000000000000000000000000',
        },
        message: {
          name: 'Test User',
          wallet: accounts[0],
        },
      };

      const response = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [accounts[0], JSON.stringify(typedData)],
      });
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleWalletConnectWithSubAccount = async () => {
    if (!provider) return;

    const { account: ownerAccount } = await subAccountsConfig.toOwnerAccount();

    const params = [
      {
        capabilities: {
          addSubAccount: {
            account: {
              type: 'create',
              keys: [
                {
                  type: ownerAccount.address ? 'address' : 'webauthn-p256',
                  publicKey: ownerAccount.address ?? ownerAccount.publicKey,
                },
              ],
            },
          },
        },
      },
    ];

    try {
      const response = (await provider.request({
        method: 'wallet_connect',
        params,
      })) as WalletConnectResponse;
      setLastResult(JSON.stringify(response, null, 2));
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
        params: [],
      });
      setAccounts(accounts as string[]);
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleWalletConnect = async () => {
    if (!provider) return;

    try {
      const response = (await provider.request({
        method: 'wallet_connect',
        params: [],
      })) as WalletConnectResponse;
      setLastResult(JSON.stringify(response, null, 2));
      setAccounts(response.accounts.map((acc) => acc.address));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleSetDefaultSpendLimits = (value: string) => {
    const defaultSpendLimits = {
      [baseSepolia.id]: [
        {
          token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          allowance: '0x2386F26FC10000',
          period: 86400,
        } as SpendLimitConfig,
      ],
    };

    if (value === 'true') {
      setSubAccountsConfig((prev) => ({ ...prev, defaultSpendLimits }));
    } else {
      setSubAccountsConfig((prev) => ({ ...prev, defaultSpendLimits: {} }));
    }
  };

  const handleEthSend = async (amount: string) => {
    if (!provider || !accounts.length) return;

    try {
      setSendingAmounts((prev) => ({ ...prev, [amount]: true }));
      const to = '0x8d25687829d6b85d9e0020b8c89e3ca24de20a89';
      const value = parseEther(amount);

      const response = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to: to,
            value: numberToHex(value),
            data: '0x',
          },
        ],
      });
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    } finally {
      setSendingAmounts((prev) => ({ ...prev, [amount]: false }));
    }
  };

  const handleAttributionDataSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setConfig({
        ...config,
        attribution: { dataSuffix: value as `0x${string}` },
      });
    } else {
      const { attribution, ...rest } = config;
      setConfig(rest);
    }
  };

  const handleAttributionModeChange = (value: string) => {
    if (value === 'auto') {
      setConfig({
        ...config,
        attribution: { auto: true },
      });
    } else if (value === 'manual') {
      setConfig({
        ...config,
        attribution: { dataSuffix: '0x' as `0x${string}` },
      });
    } else {
      const { attribution, ...restConfig } = config;
      setConfig(restConfig);
    }
  };

  const getAttributionMode = () => {
    if (!config.attribution) return 'none';
    if (config.attribution.auto) return 'auto';
    return 'manual';
  };

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        <Box w="full" textAlign="left" fontSize="lg" fontWeight="bold">
          Configuration
        </Box>
        <FormControl>
          <FormLabel>Select Signer Type</FormLabel>
          <RadioGroup value={signerType} onChange={(value: SignerType) => setSignerType(value)}>
            <Stack direction="row">
              <Radio value="cryptokey">CryptoKey</Radio>
              <Radio value="secp256k1">secp256k1</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Auto Sub-Accounts</FormLabel>
          <RadioGroup
            value={(subAccountsConfig?.enableAutoSubAccounts || false).toString()}
            onChange={(value) =>
              setSubAccountsConfig((prev) => ({ ...prev, enableAutoSubAccounts: value === 'true' }))
            }
          >
            <Stack direction="row">
              <Radio value="true">Enabled</Radio>
              <Radio value="false">Disabled</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Default Spend Limit</FormLabel>
          <RadioGroup
            value={subAccountsConfig?.defaultSpendLimits?.[baseSepolia.id] ? 'true' : 'false'}
            onChange={handleSetDefaultSpendLimits}
          >
            <Stack direction="row">
              <Radio value="true">Enabled</Radio>
              <Radio value="false">Disabled</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Dynamic Spend Limits</FormLabel>
          <RadioGroup
            value={(subAccountsConfig?.dynamicSpendLimits || false).toString()}
            onChange={(value) =>
              setSubAccountsConfig((prev) => ({ ...prev, dynamicSpendLimits: value === 'true' }))
            }
          >
            <Stack direction="row">
              <Radio value="true">Enabled</Radio>
              <Radio value="false">Disabled</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Attribution</FormLabel>
          <RadioGroup value={getAttributionMode()} onChange={handleAttributionModeChange}>
            <Stack direction="row">
              <Radio value="none">None</Radio>
              <Radio value="auto">Auto</Radio>
              <Radio value="manual">Manual</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        {getAttributionMode() === 'manual' && (
          <FormControl>
            <FormLabel>Attribution Data Suffix (hex)</FormLabel>
            <Input
              placeholder="0x..."
              value={config.attribution?.dataSuffix || ''}
              onChange={handleAttributionDataSuffixChange}
            />
          </FormControl>
        )}
        {accounts.length > 0 && (
          <Box w="full">
            <Box fontSize="lg" fontWeight="bold" mb={2}>
              Connected Accounts
            </Box>
            <VStack w="full" spacing={2} align="stretch">
              {accounts.map((account) => (
                <Box
                  key={account}
                  p={3}
                  bg="gray.700"
                  borderRadius="md"
                  fontFamily="monospace"
                  fontSize="sm"
                >
                  {account}
                </Box>
              ))}
            </VStack>
          </Box>
        )}
        <Box w="full" textAlign="left" fontSize="lg" fontWeight="bold">
          RPCs
        </Box>
        <Button w="full" onClick={handleRequestAccounts}>
          eth_requestAccounts
        </Button>
        <Button w="full" onClick={handleSendTransaction} isDisabled={!accounts.length}>
          eth_sendTransaction
        </Button>
        <Button w="full" onClick={handleSignTypedData} isDisabled={!accounts.length}>
          eth_signTypedData_v4
        </Button>
        <Button w="full" onClick={handleWalletConnectWithSubAccount}>
          wallet_connect (addSubAccount)
        </Button>
        <Button w="full" onClick={handleWalletConnect}>
          wallet_connect
        </Button>
        <Box w="full" textAlign="left" fontSize="lg" fontWeight="bold">
          Send
        </Box>
        <HStack w="full" spacing={4}>
          {['0.0001', '0.001', '0.01'].map((amount) => (
            <Button
              key={amount}
              flex={1}
              onClick={() => handleEthSend(amount)}
              isDisabled={!accounts.length || sendingAmounts[amount]}
              isLoading={sendingAmounts[amount]}
              loadingText="Sending..."
              size="lg"
            >
              {amount} ETH
            </Button>
          ))}
        </HStack>
        {lastResult && (
          <Box
            as="pre"
            w="full"
            p={2}
            bg="gray.900"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
            overflow="auto"
            whiteSpace="pre-wrap"
          >
            {lastResult}
          </Box>
        )}
      </VStack>
    </Container>
  );
}

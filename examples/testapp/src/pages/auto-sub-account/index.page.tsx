import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from '@chakra-ui/react';
import { SpendLimitConfig } from '@coinbase/wallet-sdk/dist/core/provider/interface';
import { useState } from 'react';
import { baseSepolia } from 'viem/chains';
import { useConfig } from '../../context/ConfigContextProvider';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';

export default function AutoSubAccount() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<string>();
  const { subAccountsConfig, setSubAccountsConfig } = useConfig();
  const { provider } = useEIP1193Provider();

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
      setSubAccountsConfig({ defaultSpendLimits });
    } else {
      setSubAccountsConfig({ defaultSpendLimits: {} });
    }
  };

  return (
    <Container mb={16}>
      <VStack w="full" spacing={4}>
        <FormControl>
          <FormLabel>Auto Sub-Accounts</FormLabel>
          <RadioGroup
            value={(subAccountsConfig?.enableAutoSubAccounts || false).toString()}
            onChange={(value) => setSubAccountsConfig({ enableAutoSubAccounts: value === 'true' })}
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
        <Button w="full" onClick={handleRequestAccounts}>
          eth_requestAccounts
        </Button>
        <Button w="full" onClick={handleSendTransaction} isDisabled={!accounts.length}>
          eth_sendTransaction
        </Button>
        <Button w="full" onClick={handleSignTypedData} isDisabled={!accounts.length}>
          eth_signTypedData_v4
        </Button>
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

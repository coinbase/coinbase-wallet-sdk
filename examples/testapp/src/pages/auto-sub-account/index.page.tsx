import { getCryptoKeyAccount } from '@base-org/account';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Link,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import {
  createPublicClient,
  encodeFunctionData,
  http,
  numberToHex,
  parseEther,
  parseUnits,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as chains from 'viem/chains';
import { useConfig } from '../../context/ConfigContextProvider';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import { unsafe_generateOrLoadPrivateKey } from '../../utils/unsafe_generateOrLoadPrivateKey';

type SignerType = 'cryptokey' | 'secp256k1';
type SendMethod = 'eth_sendTransaction' | 'wallet_sendCalls';

interface WalletConnectResponse {
  accounts: Array<{
    address: string;
    capabilities?: Record<string, unknown>;
  }>;
  chainIds?: string[];
}

const LOCAL_STORAGE_KEY = 'ba-playground:config';

export default function AutoSubAccount() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<string>();
  const [sendingAmounts, setSendingAmounts] = useState<Record<number, boolean>>({});
  const [sendingUsdcAmounts, setSendingUsdcAmounts] = useState<Record<string, boolean>>({});
  const [signerType, setSignerType] = useState<SignerType>('cryptokey');
  const [sendMethod, setSendMethod] = useState<SendMethod>('eth_sendTransaction');
  const [walletConnectCapabilities, setWalletConnectCapabilities] = useState({
    siwe: false,
    addSubAccount: false,
  });
  const [availableChains, setAvailableChains] = useState<string[]>([]);
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const { subAccountsConfig, setSubAccountsConfig, config, setConfig } = useConfig();
  const { provider } = useEIP1193Provider();

  // Load persisted configs on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        if (parsed.signerType) setSignerType(parsed.signerType);
        if (parsed.sendMethod) setSendMethod(parsed.sendMethod);
        if (parsed.walletConnectCapabilities)
          setWalletConnectCapabilities(parsed.walletConnectCapabilities);

        if (parsed.subAccountCreation) {
          setSubAccountsConfig((prev) => ({ ...prev, creation: parsed.subAccountCreation }));
        }
        if (parsed.defaultAccount) {
          setSubAccountsConfig((prev) => ({ ...prev, defaultAccount: parsed.defaultAccount }));
        }
        if (parsed.funding) {
          setSubAccountsConfig((prev) => ({ ...prev, funding: parsed.funding }));
        }
        if (parsed.attribution) {
          setConfig((prev) => ({ ...prev, attribution: parsed.attribution }));
        }
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }
  }, [setSubAccountsConfig, setConfig]);

  // Persist configs on change
  useEffect(() => {
    const configToStore = {
      signerType,
      sendMethod,
      walletConnectCapabilities,
      subAccountCreation: subAccountsConfig?.creation,
      defaultAccount: subAccountsConfig?.defaultAccount,
      funding: subAccountsConfig?.funding,
      attribution: config?.attribution,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToStore));
  }, [
    signerType,
    sendMethod,
    walletConnectCapabilities,
    subAccountsConfig?.creation,
    subAccountsConfig?.defaultAccount,
    subAccountsConfig?.funding,
    config?.attribution,
  ]);

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

  const getPublicClient = async () => {
    if (!provider) throw new Error('Provider not initialized');

    // Get current chain ID if not already set
    const chainId =
      currentChainId ||
      ((await provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string);

    const chainIdDecimal = Number.parseInt(chainId, 16);

    // Find the chain in viem/chains
    const chain = Object.values(chains).find((c) => c.id === chainIdDecimal);
    if (!chain) {
      throw new Error(`Chain with ID ${chainIdDecimal} (${chainId}) not found in viem/chains`);
    }

    return createPublicClient({
      chain,
      transport: http(),
    });
  };

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

  const handleEthAccounts = async () => {
    if (!provider) return;

    try {
      const response = await provider.request({
        method: 'eth_accounts',
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

  const handlePersonalSign = async () => {
    if (!provider || !accounts.length) return;

    try {
      const message = 'Hello from Coinbase Account SDK!';
      const hexMessage = toHex(message);

      const response = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, accounts[0]],
      });

      const publicClient = await getPublicClient();

      const isValid = await publicClient.verifyMessage({
        address: accounts[0] as `0x${string}`,
        message,
        signature: response as `0x${string}`,
      });

      setLastResult(`isValid: ${isValid}\n${response}`);
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleSignTypedData = async () => {
    if (!provider || !accounts.length) return;

    try {
      const publicClient = await getPublicClient();
      const chainIdDecimal = publicClient.chain.id;

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
          chainId: chainIdDecimal,
          verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
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

      const isValid = await publicClient.verifyTypedData({
        address: accounts[0] as `0x${string}`,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
        signature: response as `0x${string}`,
      });

      setLastResult(`isValid: ${isValid}\n${response}`);
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleWalletConnect = async () => {
    if (!provider) return;

    let params: unknown[] = [];

    // Build params based on selected capabilities
    if (walletConnectCapabilities.siwe || walletConnectCapabilities.addSubAccount) {
      const capabilities: Record<string, unknown> = {};

      // Add SIWE capability if selected
      if (walletConnectCapabilities.siwe) {
        capabilities.signInWithEthereum = {
          chainId: toHex(8453),
          nonce: Math.random().toString(36).substring(2, 15),
        };
      }

      // Add addSubAccount capability if selected
      if (walletConnectCapabilities.addSubAccount) {
        const { account: ownerAccount } = await subAccountsConfig.toOwnerAccount();
        capabilities.addSubAccount = {
          account: {
            type: 'create',
            keys: [
              {
                type: ownerAccount.address ? 'address' : 'webauthn-p256',
                publicKey: ownerAccount.address ?? ownerAccount.publicKey,
              },
            ],
          },
        };
      }

      params = [
        {
          ...(walletConnectCapabilities.siwe && { version: '1' }),
          capabilities,
        },
      ];
    }

    try {
      const response = (await provider.request({
        method: 'wallet_connect',
        params,
      })) as WalletConnectResponse;

      // Verify SIWE signature if present
      let verificationResult = '';
      if (response.accounts && response.accounts.length > 0) {
        const account = response.accounts[0];
        if (account.capabilities && 'signInWithEthereum' in account.capabilities) {
          const siweCapability = account.capabilities.signInWithEthereum as {
            message: string;
            signature: string;
          };

          try {
            // Parse chain ID from SIWE message
            const chainIdMatch = siweCapability.message.match(/Chain ID: (\d+)/);
            if (!chainIdMatch) {
              throw new Error('Could not extract chain ID from SIWE message');
            }
            const siweChainId = Number.parseInt(chainIdMatch[1], 10);

            // Find the chain in viem/chains
            const chain = Object.values(chains).find((c) => c.id === siweChainId);
            if (!chain) {
              throw new Error(`Chain with ID ${siweChainId} not found in viem/chains`);
            }

            // Create a public client for the SIWE chain
            const publicClient = createPublicClient({
              chain,
              transport: http(),
            });

            // Verify the SIWE signature
            const isValid = await publicClient.verifyMessage({
              address: account.address as `0x${string}`,
              message: siweCapability.message,
              signature: siweCapability.signature as `0x${string}`,
            });

            verificationResult = `SIWE Signature Verification: ${isValid ? '✓ VALID' : '✗ INVALID'} (Chain ID: ${siweChainId})\n\n`;
          } catch (verifyError) {
            console.error('SIWE verification error:', verifyError);
            verificationResult = `SIWE Signature Verification: ERROR - ${verifyError instanceof Error ? verifyError.message : String(verifyError)}\n\n`;
          }
        }
      }

      setLastResult(verificationResult + JSON.stringify(response, null, 2));

      // Extract available chains from response
      if (response.chainIds && response.chainIds.length > 0) {
        setAvailableChains(response.chainIds);
      }

      // Call eth_accounts to get and set the accounts after successful connection
      const accountsResponse = await provider.request({
        method: 'eth_accounts',
        params: [],
      });
      setAccounts(accountsResponse as string[]);

      // Get current chain ID
      const chainId = await provider.request({
        method: 'eth_chainId',
        params: [],
      });
      setCurrentChainId(chainId as string);
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleSwitchChain = async (chainId: string) => {
    if (!provider) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      setCurrentChainId(chainId);
      setLastResult(`Switched to chain: ${chainId}`);
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    }
  };

  const handleEthSend = async (amount: string) => {
    if (!provider || !accounts.length) return;

    try {
      setSendingAmounts((prev) => ({ ...prev, [amount]: true }));
      const to = '0x8d25687829d6b85d9e0020b8c89e3ca24de20a89';
      const value = parseEther(amount);

      let response;
      if (sendMethod === 'eth_sendTransaction') {
        response = await provider.request({
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
      } else {
        // Get current chain ID if not already set
        const chainId =
          currentChainId ||
          ((await provider.request({
            method: 'eth_chainId',
            params: [],
          })) as string);

        // wallet_sendCalls with paymaster support
        response = await provider.request({
          method: 'wallet_sendCalls',
          params: [
            {
              version: '1.0',
              chainId: chainId,
              from: accounts[0],
              calls: [
                {
                  to: to,
                  value: numberToHex(value),
                  data: '0x',
                },
              ],
              capabilities: {
                paymasterService: {
                  url: 'https://example.paymaster.com',
                },
              },
            },
          ],
        });
      }
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    } finally {
      setSendingAmounts((prev) => ({ ...prev, [amount]: false }));
    }
  };

  const handleUsdcSend = async (amount: string) => {
    if (!provider || !accounts.length) return;

    try {
      setSendingUsdcAmounts((prev) => ({ ...prev, [amount]: true }));

      // Get current chain ID if not already set
      const chainId =
        currentChainId ||
        ((await provider.request({
          method: 'eth_chainId',
          params: [],
        })) as string);
      const chainIdDecimal = Number.parseInt(chainId, 16);

      // USDC contract addresses by chain ID
      const usdcAddresses: Record<number, string> = {
        8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
        84532: '0x036cbd53842c5426634e7929541ec2318f3dcf7e', // Base Sepolia
      };

      const usdcAddress = usdcAddresses[chainIdDecimal];
      if (!usdcAddress) {
        throw new Error(`USDC not supported on chain ID ${chainIdDecimal}`);
      }

      const to = '0x8d25687829d6b85d9e0020b8c89e3ca24de20a89';
      const value = parseUnits(amount, 6); // USDC has 6 decimals

      // Encode ERC20 transfer function call
      const data = encodeFunctionData({
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'transfer',
        args: [to, value],
      });

      let response;
      if (sendMethod === 'eth_sendTransaction') {
        response = await provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: accounts[0],
              to: usdcAddress,
              value: '0x0',
              data,
            },
          ],
        });
      } else {
        // wallet_sendCalls with paymaster support
        response = await provider.request({
          method: 'wallet_sendCalls',
          params: [
            {
              version: '1.0',
              chainId: chainId,
              from: accounts[0],
              calls: [
                {
                  to: usdcAddress,
                  value: '0x0',
                  data,
                },
              ],
              capabilities: {
                paymasterService: {
                  url: 'https://example.paymaster.com',
                },
              },
            },
          ],
        });
      }
      setLastResult(JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('error', e);
      setLastResult(JSON.stringify(e, null, 2));
    } finally {
      setSendingUsdcAmounts((prev) => ({ ...prev, [amount]: false }));
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
      <Text fontSize="3xl" fontWeight="bold" mb={4}>
        Auto Sub Account
      </Text>
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
          <FormLabel>
            Sub-Account Creation{' '}
            <Link
              href="https://docs.base.org/base-account/improve-ux/sub-accounts"
              isExternal
              color="blue.500"
              fontSize="sm"
              fontWeight="normal"
            >
              Docs <ExternalLinkIcon mx="2px" />
            </Link>
          </FormLabel>
          <RadioGroup
            value={subAccountsConfig?.creation || 'manual'}
            onChange={(value) =>
              setSubAccountsConfig((prev) => ({
                ...prev,
                creation: value as 'on-connect' | 'manual',
              }))
            }
          >
            <Stack direction="row">
              <Radio value="on-connect">On Connect</Radio>
              <Radio value="manual">Manual</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Default Account</FormLabel>
          <RadioGroup
            value={subAccountsConfig?.defaultAccount || 'universal'}
            onChange={(value) =>
              setSubAccountsConfig((prev) => ({
                ...prev,
                defaultAccount: value as 'sub' | 'universal',
              }))
            }
          >
            <Stack direction="row">
              <Radio value="sub">Sub</Radio>
              <Radio value="universal">Universal</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Funding Mode</FormLabel>
          <RadioGroup
            value={subAccountsConfig?.funding || 'spend-permissions'}
            onChange={(value) =>
              setSubAccountsConfig((prev) => ({
                ...prev,
                funding: value as 'spend-permissions' | 'manual',
              }))
            }
          >
            <Stack direction="row">
              <Radio value="spend-permissions">Spend Permissions</Radio>
              <Radio value="manual">Manual</Radio>
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
        <FormControl>
          <FormLabel>wallet_connect Capabilities</FormLabel>
          <Stack spacing={2}>
            <Checkbox
              isChecked={walletConnectCapabilities.siwe}
              onChange={(e) =>
                setWalletConnectCapabilities((prev) => ({ ...prev, siwe: e.target.checked }))
              }
            >
              SIWE (Sign In With Ethereum)
            </Checkbox>
            <Checkbox
              isChecked={walletConnectCapabilities.addSubAccount}
              onChange={(e) =>
                setWalletConnectCapabilities((prev) => ({
                  ...prev,
                  addSubAccount: e.target.checked,
                }))
              }
            >
              Add Sub Account
            </Checkbox>
          </Stack>
        </FormControl>
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
                  bg="gray.100"
                  borderRadius="md"
                  fontFamily="monospace"
                  fontSize="sm"
                  color="gray.800"
                  _dark={{ bg: 'gray.700', color: 'gray.200' }}
                >
                  {account}
                </Box>
              ))}
            </VStack>
          </Box>
        )}
        {availableChains.length > 0 && (
          <FormControl>
            <FormLabel>Available Chains</FormLabel>
            <Select
              value={currentChainId}
              onChange={(e) => handleSwitchChain(e.target.value)}
              placeholder="Select chain"
            >
              {availableChains.map((chainId) => (
                <option key={chainId} value={chainId}>
                  Chain ID: {chainId}{' '}
                  {Number.parseInt(chainId, 16) ? `(${Number.parseInt(chainId, 16)})` : ''}
                </option>
              ))}
            </Select>
            {currentChainId && (
              <Text mt={2} fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                Current Chain: {currentChainId}{' '}
                {Number.parseInt(currentChainId, 16)
                  ? `(${Number.parseInt(currentChainId, 16)})`
                  : ''}
              </Text>
            )}
          </FormControl>
        )}
        <Box w="full" textAlign="left" fontSize="lg" fontWeight="bold">
          RPCs
        </Box>
        <Button
          w="full"
          onClick={handleRequestAccounts}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          eth_requestAccounts
        </Button>
        <Button
          w="full"
          onClick={handleEthAccounts}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          eth_accounts
        </Button>
        <Button
          w="full"
          onClick={handleSendTransaction}
          isDisabled={!accounts.length}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          eth_sendTransaction
        </Button>
        <Button
          w="full"
          onClick={handlePersonalSign}
          isDisabled={!accounts.length}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          personal_sign
        </Button>
        <Button
          w="full"
          onClick={handleSignTypedData}
          isDisabled={!accounts.length}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          eth_signTypedData_v4
        </Button>
        <Button
          w="full"
          onClick={handleWalletConnect}
          bg="blue.500"
          color="white"
          border="1px solid"
          borderColor="blue.500"
          _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
          _dark={{
            bg: 'blue.600',
            borderColor: 'blue.600',
            _hover: { bg: 'blue.700', borderColor: 'blue.700' },
          }}
        >
          wallet_connect
        </Button>
        <FormControl>
          <FormLabel>Send Method</FormLabel>
          <RadioGroup value={sendMethod} onChange={(value: SendMethod) => setSendMethod(value)}>
            <Stack direction="row">
              <Radio value="eth_sendTransaction">eth_sendTransaction</Radio>
              <Radio value="wallet_sendCalls">wallet_sendCalls (with paymaster)</Radio>
            </Stack>
          </RadioGroup>
        </FormControl>
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
              bg="green.500"
              color="white"
              border="1px solid"
              borderColor="green.500"
              _hover={{ bg: 'green.600', borderColor: 'green.600' }}
              _dark={{
                bg: 'green.600',
                borderColor: 'green.600',
                _hover: { bg: 'green.700', borderColor: 'green.700' },
              }}
            >
              {amount} ETH
            </Button>
          ))}
        </HStack>
        <Box w="full" textAlign="left" fontSize="lg" fontWeight="bold">
          Send USDC
        </Box>
        <HStack w="full" spacing={4}>
          {['0.001', '0.01', '0.1', '1'].map((amount) => (
            <Button
              key={amount}
              flex={1}
              onClick={() => handleUsdcSend(amount)}
              isDisabled={!accounts.length || sendingUsdcAmounts[amount]}
              isLoading={sendingUsdcAmounts[amount]}
              loadingText="Sending..."
              size="lg"
              bg="purple.500"
              color="white"
              border="1px solid"
              borderColor="purple.500"
              _hover={{ bg: 'purple.600', borderColor: 'purple.600' }}
              _dark={{
                bg: 'purple.600',
                borderColor: 'purple.600',
                _hover: { bg: 'purple.700', borderColor: 'purple.700' },
              }}
            >
              {amount} USDC
            </Button>
          ))}
        </HStack>
        {lastResult && (
          <Box
            as="pre"
            w="full"
            p={2}
            bg="gray.50"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.300"
            overflow="auto"
            whiteSpace="pre-wrap"
            color="gray.800"
            _dark={{ bg: 'gray.900', borderColor: 'gray.700', color: 'gray.200' }}
          >
            {lastResult}
          </Box>
        )}
      </VStack>
    </Container>
  );
}

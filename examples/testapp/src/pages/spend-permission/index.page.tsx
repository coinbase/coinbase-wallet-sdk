import {
  fetchPermissions,
  prepareSpendCallData,
  requestSpendPermission,
} from '@coinbase/wallet-sdk/spend-permission';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, RepeatIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Icon,
  Link,
  NumberInput,
  NumberInputField,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useBreakpointValue,
  useToast,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  parseUnits,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import {
  CopyableText,
  FundSpenderCard,
  LocalSpenderCard,
  NetworkSwitcher,
  StatusItem,
  truncateAddress,
  truncateHash,
} from './components';
import {
  EIP7702_DELEGATION_PREFIX,
  IS_OWNER_ADDRESS_ABI,
  NATIVE_TOKEN,
  NETWORKS,
  OWNER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
  getNativeTokenSymbol,
  getNetworkByChainId,
} from './constants';
import { useLocalSpender, useTokenPrices } from './hooks';
import type { AllChainsStatus, FetchedPermission, SpendResult } from './types';
import { parseChainIdHex } from './utils';

export default function SpendPermissionPage() {
  const { provider } = useEIP1193Provider();
  const toast = useToast();

  // Responsive values
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const headingSize = useBreakpointValue({ base: 'lg', md: 'xl' });

  // Wallet connection state
  const [connected, setConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [connectedBalance, setConnectedBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Chain status state
  const [allChainsStatus, setAllChainsStatus] = useState<AllChainsStatus>({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isChainStatusExpanded, setIsChainStatusExpanded] = useState(false);

  // Network switching state
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  // Hooks
  const { formatUsd } = useTokenPrices();
  const {
    localSpenderAddress,
    localSpenderPrivateKey,
    spenderBalances,
    isFetchingBalances,
    generateNewSpender,
    fetchSpenderBalances,
  } = useLocalSpender();

  // Spend Permission Request State
  const [spSpender, setSpSpender] = useState<string>('');
  const [spToken] = useState<string>(NATIVE_TOKEN);
  const [spAllowance, setSpAllowance] = useState<string>('0.001');
  const [spPeriodInDays, setSpPeriodInDays] = useState<number>(30);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isRequestSettingsExpanded, setIsRequestSettingsExpanded] = useState(false);

  // Fetched Permissions State
  const [fetchedPermissions, setFetchedPermissions] = useState<FetchedPermission[]>([]);
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(false);
  const [isPermissionHistoryExpanded, setIsPermissionHistoryExpanded] = useState(false);

  // Selected Permission State (for spending)
  const [selectedPermission, setSelectedPermission] = useState<FetchedPermission | null>(null);
  const [spendAmount, setSpendAmount] = useState<string>('0.000001');
  const [isSpending, setIsSpending] = useState(false);
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);

  // Fund Spender State
  const [fundChainId, setFundChainId] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState<string>('0.01');
  const [isFundingSpender, setIsFundingSpender] = useState(false);

  // Auto-fill spender address when local spender is available
  useEffect(() => {
    if (localSpenderAddress && !spSpender) {
      setSpSpender(localSpenderAddress);
    }
  }, [localSpenderAddress, spSpender]);

  // Fetch connected wallet balance
  const fetchConnectedBalance = useCallback(async () => {
    if (!connectedAddress || !currentChainId) {
      setConnectedBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const network = NETWORKS.find((n) => n.chainId === currentChainId);
      if (!network) {
        setConnectedBalance(null);
        return;
      }

      const client = createPublicClient({
        chain: network.chain,
        transport: http(),
      });

      const balance = await client.getBalance({ address: getAddress(connectedAddress) });
      setConnectedBalance(formatUnits(balance, 18));
    } catch (error) {
      console.error('Failed to fetch connected balance:', error);
      setConnectedBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [connectedAddress, currentChainId]);

  useEffect(() => {
    fetchConnectedBalance();
  }, [fetchConnectedBalance]);

  // Check for existing connection on page load
  const checkExistingConnection = useCallback(async () => {
    if (!provider) return;

    try {
      // Use eth_accounts to check without prompting
      const accounts = (await provider.request({
        method: 'eth_accounts',
      })) as string[];

      if (accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        setConnected(true);

        const chainIdHex = (await provider.request({
          method: 'eth_chainId',
        })) as string;
        setCurrentChainId(parseChainIdHex(chainIdHex));
      }
    } catch (error) {
      // Silently fail - user can manually connect
      console.error('Failed to check existing connection:', error);
    }
  }, [provider]);

  // Auto-check for existing connection on mount
  useEffect(() => {
    checkExistingConnection();
  }, [checkExistingConnection]);

  // Handle wallet connection (manual connect button)
  const handleConnect = useCallback(async () => {
    if (!provider) return;

    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        setConnected(true);

        const chainIdHex = (await provider.request({
          method: 'eth_chainId',
        })) as string;
        setCurrentChainId(parseChainIdHex(chainIdHex));
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [provider, toast]);

  // Fetch all chains status
  const fetchAllChainsStatus = useCallback(async () => {
    if (!connectedAddress) return;

    setIsLoadingStatus(true);

    try {
      // Fetch bytecode and owner info for all chains in parallel
      const results = await Promise.allSettled(
        NETWORKS.map(async (network) => {
          const client = createPublicClient({
            chain: network.chain,
            transport: http(),
          });

          const address = getAddress(connectedAddress);
          const bytecode = await client.getCode({ address });

          let is7702 = false;
          let delegateAddress: string | null = null;
          let isDeployed = false;
          let hasPermissionManagerAsOwner = false;
          const owners: string[] = [];

          if (bytecode && bytecode !== '0x') {
            isDeployed = true;

            // Check for 7702 delegation
            if (bytecode.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX.toLowerCase())) {
              is7702 = true;
              delegateAddress = `0x${bytecode.slice(EIP7702_DELEGATION_PREFIX.length, EIP7702_DELEGATION_PREFIX.length + 40)}`;
            }

            // Get the contract to query for owners (either delegate or the address itself)
            const contractToQuery = is7702 && delegateAddress ? delegateAddress : address;

            // Fetch owners
            try {
              const ownerCount = (await client.readContract({
                address: contractToQuery as `0x${string}`,
                abi: OWNER_ABI,
                functionName: 'ownerCount',
              })) as bigint;

              for (let i = 0; i < Number(ownerCount); i++) {
                const ownerBytes = (await client.readContract({
                  address: contractToQuery as `0x${string}`,
                  abi: OWNER_ABI,
                  functionName: 'ownerAtIndex',
                  args: [BigInt(i)],
                })) as `0x${string}`;
                owners.push(ownerBytes.toLowerCase());
              }
            } catch {
              // No owners or not a smart wallet
            }

            // Check if Permission Manager is an owner
            try {
              const isPMOwner = (await client.readContract({
                address: contractToQuery as `0x${string}`,
                abi: IS_OWNER_ADDRESS_ABI,
                functionName: 'isOwnerAddress',
                args: [SPEND_PERMISSION_MANAGER_ADDRESS],
              })) as boolean;
              hasPermissionManagerAsOwner = isPMOwner;
            } catch {
              // Not a smart wallet or doesn't have isOwnerAddress
            }
          }

          return {
            chainId: network.chainId,
            chainName: network.name,
            bytecode,
            is7702,
            delegateAddress,
            isDeployed,
            hasPermissionManagerAsOwner,
            owners,
          };
        })
      );

      // Build a union of all owners across all chains
      const allOwnersUnion = new Set<string>();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.owners.length > 0) {
          for (const owner of result.value.owners) {
            allOwnersUnion.add(owner);
          }
        }
      }

      // Determine if the address is a smart wallet on any chain
      const isSmartWalletOnAnyChain = results.some(
        (result) => result.status === 'fulfilled' && result.value.isDeployed && !result.value.is7702
      );

      // Build status map
      const statusMap: AllChainsStatus = {};

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;

        const accountType =
          result.value.isDeployed || isSmartWalletOnAnyChain ? 'Smart Wallet' : 'EOA';

        // Check pending ownership
        let hasPendingOwnershipChange = false;
        if (
          (result.value.isDeployed || result.value.is7702) &&
          result.value.owners.length > 0 &&
          allOwnersUnion.size > 0
        ) {
          const chainOwnerSet = new Set(result.value.owners);
          const allOwnersArray = Array.from(allOwnersUnion);
          for (const owner of allOwnersArray) {
            if (!chainOwnerSet.has(owner)) {
              hasPendingOwnershipChange = true;
              break;
            }
          }
        }

        statusMap[result.value.chainId] = {
          chainId: result.value.chainId,
          chainName: result.value.chainName,
          accountType,
          isEOA7702Delegated: result.value.is7702,
          hasPendingOwnershipChange,
          isDeployed: result.value.isDeployed,
          hasPermissionManagerAsOwner: result.value.hasPermissionManagerAsOwner,
          bytecode: result.value.bytecode,
        };
      }

      setAllChainsStatus(statusMap);
    } catch (error) {
      console.error('Failed to fetch wallet status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [connectedAddress]);

  // Fetch status when connected
  useEffect(() => {
    if (connected && connectedAddress) {
      fetchAllChainsStatus();
    }
  }, [connected, connectedAddress, fetchAllChainsStatus]);

  // Handle network switch
  const handleSwitchNetwork = useCallback(
    async (chainId: number) => {
      if (!provider) return;

      setIsSwitchingNetwork(true);
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        setCurrentChainId(chainId);
      } catch (error) {
        console.error('Failed to switch network:', error);
        toast({
          title: 'Network Switch Failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsSwitchingNetwork(false);
      }
    },
    [provider, toast]
  );

  // Handle fund spender
  const handleFundSpender = useCallback(async () => {
    if (!provider || !localSpenderAddress || !fundChainId) return;

    setIsFundingSpender(true);

    try {
      const amountInWei = parseUnits(fundAmount, 18);

      // Switch to the selected chain first if needed
      if (currentChainId !== fundChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${fundChainId.toString(16)}` }],
        });
        setCurrentChainId(fundChainId);
      }

      // Send transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            to: localSpenderAddress,
            value: `0x${amountInWei.toString(16)}`,
          },
        ],
      });

      toast({
        title: 'Funding Successful',
        description: `Sent ${fundAmount} ${getNativeTokenSymbol(fundChainId)} to local spender. Tx: ${(txHash as string).slice(0, 10)}...`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      await fetchSpenderBalances();
      await fetchConnectedBalance();
    } catch (error) {
      console.error('Failed to fund spender:', error);
      toast({
        title: 'Funding Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFundingSpender(false);
    }
  }, [
    provider,
    localSpenderAddress,
    fundChainId,
    fundAmount,
    currentChainId,
    toast,
    fetchSpenderBalances,
    fetchConnectedBalance,
  ]);

  // Fetch all permissions
  const handleFetchAllPermissions = useCallback(
    async (showToast = true) => {
      if (!connectedAddress || !localSpenderAddress) return;

      setIsFetchingPermissions(true);
      setFetchedPermissions([]);

      try {
        const allPermissions: FetchedPermission[] = [];

        const results = await Promise.allSettled(
          NETWORKS.map(async (network) => {
            try {
              const permissions = await fetchPermissions({
                account: connectedAddress,
                spender: localSpenderAddress,
                chainId: network.chainId,
              });
              return { chainId: network.chainId, chainName: network.name, permissions };
            } catch {
              return { chainId: network.chainId, chainName: network.name, permissions: [] };
            }
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.permissions.length > 0) {
            for (const perm of result.value.permissions) {
              allPermissions.push({
                chainId: result.value.chainId,
                chainName: result.value.chainName,
                permissionHash: perm.permissionHash,
                account: perm.permission.account,
                token: perm.permission.token,
                allowance: perm.permission.allowance,
                period: perm.permission.period,
                start: perm.permission.start,
                end: perm.permission.end,
                spender: perm.permission.spender,
                salt: perm.permission.salt,
                extraData: perm.permission.extraData,
                signature: perm.signature,
                createdAt: perm.createdAt,
              });
            }
          }
        }

        setFetchedPermissions(allPermissions);

        // Auto-select the latest permission
        if (allPermissions.length > 0) {
          const sorted = [...allPermissions].sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
          );
          setSelectedPermission(sorted[0]);
        } else {
          setSelectedPermission(null);
        }

        if (showToast) {
          toast({
            title: 'Permissions Fetched',
            description: `Found ${allPermissions.length} permission(s) across all chains.`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        if (showToast) {
          toast({
            title: 'Fetch Failed',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } finally {
        setIsFetchingPermissions(false);
      }
    },
    [connectedAddress, localSpenderAddress, toast]
  );

  // Auto-fetch permissions on load
  useEffect(() => {
    if (connected && connectedAddress && localSpenderAddress) {
      handleFetchAllPermissions(false);
    }
  }, [connected, connectedAddress, localSpenderAddress, handleFetchAllPermissions]);

  // Handle request spend permission
  const handleRequestSpendPermission = useCallback(async () => {
    if (!provider || !connectedAddress || !currentChainId) return;

    setIsRequestingPermission(true);

    try {
      const allowanceInWei = parseUnits(spAllowance, 18);

      await requestSpendPermission({
        provider,
        account: connectedAddress,
        spender: spSpender,
        token: spToken,
        chainId: currentChainId,
        allowance: allowanceInWei,
        periodInDays: spPeriodInDays,
      });

      const networkName = getNetworkByChainId(currentChainId)?.name || 'Unknown';

      toast({
        title: 'Permission Requested',
        description: `Spend permission signed for ${networkName}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh permissions
      await handleFetchAllPermissions(false);
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast({
        title: 'Request Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRequestingPermission(false);
    }
  }, [
    provider,
    connectedAddress,
    currentChainId,
    spAllowance,
    spSpender,
    spToken,
    spPeriodInDays,
    toast,
    handleFetchAllPermissions,
  ]);

  // Handle spend
  const handleSpend = useCallback(async () => {
    if (!selectedPermission || !localSpenderPrivateKey || !connectedAddress) return;

    setIsSpending(true);
    setSpendResult(null);

    try {
      const amountInWei = parseUnits(spendAmount, 18);
      const network = NETWORKS.find((n) => n.chainId === selectedPermission.chainId);

      if (!network) {
        throw new Error('Network not found for permission');
      }

      const permissionForSpend = {
        permissionHash: selectedPermission.permissionHash,
        chainId: selectedPermission.chainId,
        permission: {
          account: selectedPermission.account,
          spender: selectedPermission.spender,
          token: selectedPermission.token,
          allowance: selectedPermission.allowance,
          period: selectedPermission.period,
          start: selectedPermission.start,
          end: selectedPermission.end,
          salt: selectedPermission.salt,
          extraData: selectedPermission.extraData as Hex,
        },
        signature: selectedPermission.signature,
        createdAt: selectedPermission.createdAt,
      };

      const calls = await prepareSpendCallData(permissionForSpend, amountInWei);

      const account = privateKeyToAccount(localSpenderPrivateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(),
      });

      const txHashes: string[] = [];
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const hash = await walletClient.sendTransaction({
          account,
          to: call.to,
          data: call.data,
          value: call.value,
          chain: network.chain,
          kzg: undefined,
        } as Parameters<typeof walletClient.sendTransaction>[0]);
        txHashes.push(hash);

        if (i < calls.length - 1) {
          toast({
            title: 'Waiting for Confirmation',
            description: `Transaction ${i + 1}/${calls.length} submitted. Waiting for confirmation...`,
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
          await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: 1,
          });
        }
      }

      setSpendResult({
        success: true,
        message: 'Transaction submitted successfully!',
        txHashes,
        chainId: selectedPermission.chainId,
      });

      toast({
        title: 'Spend Successful',
        description: `Spent ${spendAmount} ${getNativeTokenSymbol(selectedPermission.chainId)} from permission`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      await fetchSpenderBalances();
    } catch (error) {
      console.error('Failed to spend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSpendResult({
        success: false,
        message: errorMessage,
      });
      toast({
        title: 'Spend Failed',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSpending(false);
    }
  }, [
    selectedPermission,
    localSpenderPrivateKey,
    connectedAddress,
    spendAmount,
    toast,
    fetchSpenderBalances,
  ]);

  // Helper functions
  const formatAllowance = (allowance: string, chainId?: number) => {
    try {
      const amount = formatUnits(BigInt(allowance), 18);
      const usdAmount = formatUsd(amount, chainId);
      const base = `${amount} ${getNativeTokenSymbol(chainId)}`;
      return usdAmount ? `${base} (${usdAmount})` : base;
    } catch {
      return allowance;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    if (timestamp === 281474976710655) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number | undefined) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get aggregated status
  const aggregatedStatus = Object.values(allChainsStatus)[0];
  const isSmartWallet = aggregatedStatus?.accountType === 'Smart Wallet';

  // Get sorted permissions
  const sortedPermissions = [...fetchedPermissions].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
  const latestPermissions = sortedPermissions.slice(0, 10);

  return (
    <Container maxW="container.lg" py={containerPadding} px={{ base: 4, md: 6 }}>
      <VStack spacing={{ base: 4, md: 8 }} align="stretch">
        {/* Hero Header */}
        <Box
          textAlign="center"
          py={{ base: 6, md: 8 }}
          px={{ base: 4, md: 6 }}
          borderRadius="2xl"
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          color="white"
          shadow="xl"
        >
          <Heading size={headingSize} mb={2} fontWeight="bold">
            Spend Permission
          </Heading>
          <Text opacity={0.9} fontSize={{ base: 'sm', md: 'lg' }}>
            Manage spend permissions across chains
          </Text>
        </Box>

        {/* ==================== SECTION 1: ACCOUNT OVERVIEW ==================== */}
        <Flex align="center" gap={2}>
          <Box w={1} h={6} bg="purple.500" borderRadius="full" />
          <Heading size="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
            1. Account Overview
          </Heading>
        </Flex>

        {/* Connection Card */}
        <Card
          variant="outline"
          borderRadius="xl"
          shadow="sm"
          _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
        >
          <CardBody p={{ base: 4, md: 6 }}>
            {!connected ? (
              <VStack spacing={4}>
                <Icon viewBox="0 0 24 24" boxSize={12} color="purple.500">
                  <path
                    fill="currentColor"
                    d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                  />
                </Icon>
                <Text color="gray.500" textAlign="center">
                  Connect your wallet to manage spend permissions
                </Text>
                <Button
                  colorScheme="purple"
                  size="lg"
                  onClick={handleConnect}
                  borderRadius="xl"
                  px={8}
                >
                  Connect Wallet
                </Button>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                <Flex
                  justify="space-between"
                  align={{ base: 'flex-start', sm: 'center' }}
                  flexDirection={{ base: 'column', sm: 'row' }}
                  gap={3}
                >
                  <Box>
                    <Flex align="center" gap={2} mb={1}>
                      <Box w={2} h={2} borderRadius="full" bg="green.400" />
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="green.600"
                        _dark={{ color: 'green.400' }}
                      >
                        Connected
                      </Text>
                    </Flex>
                    {connectedAddress && (
                      <CopyableText
                        value={connectedAddress}
                        displayText={truncateAddress(connectedAddress)}
                        fontSize={{ base: 'sm', md: 'md' }}
                        fontWeight="medium"
                        color="gray.700"
                        _dark={{ color: 'gray.200' }}
                        tooltipLabel="Click to copy address"
                      />
                    )}
                    <Flex align="center" gap={1} mt={1}>
                      <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
                        Balance:
                      </Text>
                      {isLoadingBalance ? (
                        <Skeleton height="14px" width="100px" borderRadius="sm" />
                      ) : connectedBalance !== null ? (
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={Number(connectedBalance) > 0 ? 'green.600' : 'gray.500'}
                          _dark={{
                            color: Number(connectedBalance) > 0 ? 'green.400' : 'gray.400',
                          }}
                        >
                          {Number(connectedBalance).toFixed(6)}{' '}
                          {getNativeTokenSymbol(currentChainId)}
                          {formatUsd(connectedBalance, currentChainId) && (
                            <Text as="span" color="gray.500" fontWeight="normal" ml={1}>
                              ({formatUsd(connectedBalance, currentChainId)})
                            </Text>
                          )}
                        </Text>
                      ) : (
                        <Text fontSize="xs" color="gray.400">
                          —
                        </Text>
                      )}
                    </Flex>
                  </Box>
                  <Flex gap={2} flexWrap="wrap">
                    {aggregatedStatus && (
                      <Badge
                        colorScheme={
                          aggregatedStatus.accountType === 'Smart Wallet' ? 'purple' : 'gray'
                        }
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {aggregatedStatus.accountType}
                      </Badge>
                    )}
                    {currentChainId && (
                      <Badge
                        colorScheme={getNetworkByChainId(currentChainId)?.color || 'gray'}
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {getNetworkByChainId(currentChainId)?.name || 'Unknown'}
                      </Badge>
                    )}
                  </Flex>
                </Flex>
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Chain Status - Collapsible */}
        {connected && (
          <Card
            variant="outline"
            borderRadius="xl"
            shadow="sm"
            _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
          >
            <CardBody p={{ base: 4, md: 6 }}>
              <Flex
                align="center"
                justify="space-between"
                cursor="pointer"
                onClick={() => setIsChainStatusExpanded(!isChainStatusExpanded)}
              >
                <Flex align="center" gap={2}>
                  <Heading size={{ base: 'sm', md: 'md' }}>Chain Status</Heading>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchAllChainsStatus();
                    }}
                    isLoading={isLoadingStatus}
                    leftIcon={<RepeatIcon />}
                  >
                    Refresh
                  </Button>
                </Flex>
                <Icon as={isChainStatusExpanded ? ChevronUpIcon : ChevronDownIcon} boxSize={5} />
              </Flex>

              <Collapse in={isChainStatusExpanded} animateOpacity>
                <Box mt={4}>
                  {isLoadingStatus ? (
                    <VStack spacing={2}>
                      {[...new Array(3)].map((_, i) => (
                        <Skeleton key={i} height="60px" w="full" borderRadius="md" />
                      ))}
                    </VStack>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      {NETWORKS.map((network) => {
                        const status = allChainsStatus[network.chainId];
                        if (!status) return null;

                        return (
                          <Box
                            key={network.chainId}
                            p={3}
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="gray.200"
                            _dark={{ borderColor: 'gray.600' }}
                          >
                            <Flex align="center" gap={2} mb={2}>
                              <Box w={3} h={3} borderRadius="full" bg={`${network.color}.400`} />
                              <Text fontWeight="semibold" fontSize="sm">
                                {network.name}
                              </Text>
                            </Flex>
                            <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 2, md: 3 }}>
                              <StatusItem
                                label="Deployed"
                                status={
                                  status.error
                                    ? 'error'
                                    : !isSmartWallet
                                      ? 'na'
                                      : status.isDeployed
                                        ? 'yes'
                                        : 'no'
                                }
                              />
                              <StatusItem
                                label="7702"
                                status={
                                  isSmartWallet ? 'na' : status.isEOA7702Delegated ? 'yes' : 'no'
                                }
                              />
                              <StatusItem
                                label="Pending Sync"
                                status={
                                  !(isSmartWallet && status.isDeployed) &&
                                  !status.isEOA7702Delegated
                                    ? 'na'
                                    : status.hasPendingOwnershipChange
                                      ? 'yes'
                                      : 'no'
                                }
                                yesColor="orange"
                                noColor="green"
                              />
                              <StatusItem
                                label="PM Owner"
                                status={
                                  !(isSmartWallet && status.isDeployed) &&
                                  !status.isEOA7702Delegated
                                    ? 'na'
                                    : status.hasPermissionManagerAsOwner
                                      ? 'yes'
                                      : 'no'
                                }
                              />
                            </Grid>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              </Collapse>
            </CardBody>
          </Card>
        )}

        {/* Network Switcher */}
        {connected && (
          <NetworkSwitcher
            currentChainId={currentChainId}
            onSwitchNetwork={handleSwitchNetwork}
            isSwitching={isSwitchingNetwork}
            formatUsd={formatUsd}
            connectedBalance={connectedBalance}
            isLoadingBalance={isLoadingBalance}
          />
        )}

        {/* ==================== SECTION 2: SPENDER SETUP ==================== */}
        {connected && (
          <Flex align="center" gap={2}>
            <Box w={1} h={6} bg="orange.500" borderRadius="full" />
            <Heading size="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              2. Spender Setup
            </Heading>
          </Flex>
        )}

        {connected && (
          <LocalSpenderCard
            address={localSpenderAddress}
            privateKey={localSpenderPrivateKey}
            onGenerateNew={generateNewSpender}
          />
        )}

        {connected && localSpenderAddress && (
          <FundSpenderCard
            spenderBalances={spenderBalances}
            isFetchingBalances={isFetchingBalances}
            onRefreshBalances={fetchSpenderBalances}
            selectedChainId={fundChainId}
            onSelectChain={setFundChainId}
            fundAmount={fundAmount}
            onFundAmountChange={setFundAmount}
            onFundSpender={handleFundSpender}
            isFunding={isFundingSpender}
            formatUsd={formatUsd}
          />
        )}

        {/* ==================== SECTION 3: SPEND PERMISSIONS ==================== */}
        {connected && (
          <Flex align="center" gap={2}>
            <Box w={1} h={6} bg="green.500" borderRadius="full" />
            <Heading size="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              3. Spend Permissions
            </Heading>
          </Flex>
        )}

        {/* Request Permission Card */}
        {connected && (
          <Card
            variant="outline"
            borderRadius="xl"
            shadow="sm"
            bg="green.50"
            borderColor="green.200"
            _dark={{ bg: 'green.900', borderColor: 'green.700' }}
          >
            <CardBody p={{ base: 4, md: 6 }}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size={{ base: 'sm', md: 'md' }}>Request Spend Permission</Heading>
                <Link
                  href="https://docs.base.org/base-account/reference/spend-permission-utilities/requestSpendPermission"
                  isExternal
                  color="blue.500"
                  fontSize="sm"
                >
                  Docs <ExternalLinkIcon mx="2px" />
                </Link>
              </Flex>

              {/* Quick Summary */}
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3} mb={4}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500">
                    Chain
                  </Text>
                  <Badge colorScheme={getNetworkByChainId(currentChainId || 0)?.color || 'gray'}>
                    {getNetworkByChainId(currentChainId || 0)?.name || 'Select Chain'}
                  </Badge>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500">
                    Allowance
                  </Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {spAllowance} {getNativeTokenSymbol(currentChainId)}
                    {formatUsd(spAllowance, currentChainId) && (
                      <Text as="span" color="gray.500" fontWeight="normal" ml={1}>
                        ({formatUsd(spAllowance, currentChainId)})
                      </Text>
                    )}
                  </Text>
                </Flex>
              </Grid>

              {/* Toggle Advanced Settings */}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setIsRequestSettingsExpanded(!isRequestSettingsExpanded)}
                mb={4}
                rightIcon={isRequestSettingsExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              >
                {isRequestSettingsExpanded ? 'Hide' : 'Show'} Advanced Settings
              </Button>

              <Collapse in={isRequestSettingsExpanded} animateOpacity>
                <VStack spacing={4} align="stretch" mb={4}>
                  <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">
                        Allowance ({getNativeTokenSymbol(currentChainId)})
                      </FormLabel>
                      <NumberInput
                        value={spAllowance}
                        onChange={(valueString) => setSpAllowance(valueString)}
                        min={0}
                        precision={6}
                        size="sm"
                      >
                        <NumberInputField borderRadius="md" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Period (days)</FormLabel>
                      <NumberInput
                        value={spPeriodInDays}
                        onChange={(_, valueNumber) => setSpPeriodInDays(valueNumber)}
                        min={1}
                        max={365}
                        size="sm"
                      >
                        <NumberInputField borderRadius="md" />
                      </NumberInput>
                    </FormControl>
                  </Grid>
                </VStack>
              </Collapse>

              <Button
                colorScheme="green"
                onClick={handleRequestSpendPermission}
                isLoading={isRequestingPermission}
                loadingText="Requesting..."
                size="md"
                borderRadius="lg"
                w="full"
              >
                Request Spend Permission
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Use Spend Permission Card */}
        {connected && (
          <Card
            variant="outline"
            borderRadius="xl"
            shadow="sm"
            _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
          >
            <CardBody p={{ base: 4, md: 6 }}>
              <Flex align="center" justify="space-between" mb={4}>
                <Heading size={{ base: 'sm', md: 'md' }}>Use Spend Permission</Heading>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  onClick={() => handleFetchAllPermissions()}
                  isLoading={isFetchingPermissions}
                  leftIcon={<RepeatIcon />}
                >
                  Refresh
                </Button>
              </Flex>

              {isFetchingPermissions ? (
                <VStack spacing={2}>
                  <Skeleton height="80px" w="full" borderRadius="md" />
                </VStack>
              ) : fetchedPermissions.length === 0 ? (
                <Text color="gray.500" textAlign="center" py={8}>
                  No permissions found. Request one above.
                </Text>
              ) : (
                <VStack spacing={4} align="stretch">
                  {/* Selected Permission */}
                  {selectedPermission && (
                    <Box
                      p={4}
                      borderRadius="lg"
                      bg="green.50"
                      borderWidth="2px"
                      borderColor="green.400"
                      _dark={{ bg: 'green.900', borderColor: 'green.600' }}
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <Badge colorScheme="green">Latest Permission</Badge>
                        <Text fontSize="xs" color="gray.500">
                          {formatDateTime(selectedPermission.createdAt)}
                        </Text>
                      </Flex>
                      <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="xs" color="gray.500">
                            Chain
                          </Text>
                          <Badge
                            colorScheme={
                              getNetworkByChainId(selectedPermission.chainId)?.color || 'gray'
                            }
                          >
                            {selectedPermission.chainName}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="xs" color="gray.500">
                            Allowance
                          </Text>
                          <Text fontSize="xs" fontWeight="semibold">
                            {formatAllowance(
                              selectedPermission.allowance,
                              selectedPermission.chainId
                            )}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="xs" color="gray.500">
                            Valid Until
                          </Text>
                          <Text fontSize="xs">{formatTimestamp(selectedPermission.end)}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="xs" color="gray.500">
                            Hash
                          </Text>
                          {selectedPermission.permissionHash && (
                            <CopyableText
                              value={selectedPermission.permissionHash}
                              displayText={truncateHash(selectedPermission.permissionHash)}
                              fontSize="xs"
                              tooltipLabel="Click to copy hash"
                            />
                          )}
                        </Flex>
                      </Grid>
                    </Box>
                  )}

                  {/* Permission History */}
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsPermissionHistoryExpanded(!isPermissionHistoryExpanded)}
                    rightIcon={
                      isPermissionHistoryExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />
                    }
                  >
                    Permission History ({fetchedPermissions.length})
                  </Button>

                  <Collapse in={isPermissionHistoryExpanded} animateOpacity>
                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th px={2}>Chain</Th>
                            <Th px={2}>Hash</Th>
                            <Th px={2}>Allowance</Th>
                            <Th px={2}>Requested</Th>
                            <Th px={2}>Select</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {latestPermissions.map((perm, index) => (
                            <Tr
                              key={perm.permissionHash || index}
                              bg={
                                selectedPermission?.permissionHash === perm.permissionHash
                                  ? 'green.50'
                                  : undefined
                              }
                              _dark={{
                                bg:
                                  selectedPermission?.permissionHash === perm.permissionHash
                                    ? 'green.900'
                                    : undefined,
                              }}
                            >
                              <Td px={2}>
                                <Badge
                                  colorScheme={getNetworkByChainId(perm.chainId)?.color || 'gray'}
                                  fontSize="2xs"
                                >
                                  {perm.chainName}
                                </Badge>
                              </Td>
                              <Td px={2}>
                                {perm.permissionHash && (
                                  <CopyableText
                                    value={perm.permissionHash}
                                    displayText={truncateHash(perm.permissionHash)}
                                    fontSize="xs"
                                    whiteSpace="nowrap"
                                    tooltipLabel="Click to copy hash"
                                  />
                                )}
                              </Td>
                              <Td px={2}>
                                <Text fontSize="xs" whiteSpace="nowrap">
                                  {formatAllowance(perm.allowance, perm.chainId)}
                                </Text>
                              </Td>
                              <Td px={2}>
                                <Text fontSize="xs" whiteSpace="nowrap">
                                  {formatDateTime(perm.createdAt)}
                                </Text>
                              </Td>
                              <Td px={2}>
                                <Button
                                  size="xs"
                                  colorScheme={
                                    selectedPermission?.permissionHash === perm.permissionHash
                                      ? 'green'
                                      : 'gray'
                                  }
                                  onClick={() => setSelectedPermission(perm)}
                                >
                                  {selectedPermission?.permissionHash === perm.permissionHash
                                    ? '✓'
                                    : 'Use'}
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Collapse>

                  {/* Spend Form */}
                  {selectedPermission && (
                    <Box
                      p={4}
                      borderRadius="lg"
                      bg="gray.50"
                      borderWidth="1px"
                      borderColor="gray.200"
                      _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}
                    >
                      <Text fontSize="sm" fontWeight="medium" mb={3}>
                        Spend from this permission
                      </Text>

                      <VStack spacing={3} align="stretch">
                        <FormControl>
                          <FormLabel fontSize="xs">
                            Amount to Spend (
                            {selectedPermission
                              ? getNativeTokenSymbol(selectedPermission.chainId)
                              : 'Native'}
                            )
                          </FormLabel>
                          <NumberInput
                            value={spendAmount}
                            onChange={(valueString) => setSpendAmount(valueString)}
                            min={0}
                            step={0.000001}
                            precision={18}
                            size="sm"
                          >
                            <NumberInputField
                              borderRadius="md"
                              bg="white"
                              _dark={{ bg: 'gray.800' }}
                            />
                          </NumberInput>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Supports up to 18 decimals
                          </Text>
                        </FormControl>

                        <Button
                          colorScheme={
                            getNetworkByChainId(selectedPermission.chainId)?.color || 'blue'
                          }
                          onClick={handleSpend}
                          isLoading={isSpending}
                          loadingText="Spending..."
                          size="md"
                          borderRadius="lg"
                          w="full"
                        >
                          Spend {spendAmount}{' '}
                          {selectedPermission
                            ? getNativeTokenSymbol(selectedPermission.chainId)
                            : 'Native'}
                          {selectedPermission &&
                            formatUsd(spendAmount, selectedPermission.chainId) &&
                            ` (${formatUsd(spendAmount, selectedPermission.chainId)})`}
                        </Button>
                      </VStack>
                    </Box>
                  )}

                  {/* Spend Result */}
                  {spendResult && (
                    <Box
                      p={4}
                      borderRadius="lg"
                      bg={spendResult.success ? 'green.50' : 'red.50'}
                      borderWidth="1px"
                      borderColor={spendResult.success ? 'green.200' : 'red.200'}
                      _dark={{
                        bg: spendResult.success ? 'green.900' : 'red.900',
                        borderColor: spendResult.success ? 'green.700' : 'red.700',
                      }}
                    >
                      <Flex align="center" gap={2} mb={2}>
                        <Box
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={spendResult.success ? 'green.500' : 'red.500'}
                        />
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color={spendResult.success ? 'green.700' : 'red.700'}
                          _dark={{
                            color: spendResult.success ? 'green.300' : 'red.300',
                          }}
                        >
                          {spendResult.success ? 'Transaction Successful!' : 'Transaction Failed'}
                        </Text>
                      </Flex>

                      {spendResult.success && spendResult.txHashes && spendResult.chainId && (
                        <VStack spacing={2} align="stretch">
                          {spendResult.txHashes.map((txHash, index) => {
                            const network = getNetworkByChainId(spendResult.chainId!);
                            const explorerUrl = network ? `${network.explorer}/tx/${txHash}` : null;
                            return (
                              <Flex
                                key={txHash}
                                align="center"
                                justify="space-between"
                                gap={2}
                                p={2}
                                bg="white"
                                borderRadius="md"
                                _dark={{ bg: 'gray.800' }}
                              >
                                <Box flex="1" minW={0}>
                                  <Text fontSize="xs" color="gray.500" mb={1}>
                                    {spendResult.txHashes.length > 1
                                      ? `Transaction ${index + 1}`
                                      : 'Transaction Hash'}
                                  </Text>
                                  <CopyableText
                                    value={txHash}
                                    displayText={truncateAddress(txHash, 10, 8)}
                                    fontSize="xs"
                                    color="gray.700"
                                    _dark={{ color: 'gray.300' }}
                                    tooltipLabel="Click to copy tx hash"
                                  />
                                </Box>
                                {explorerUrl && (
                                  <Link href={explorerUrl} isExternal>
                                    <Button
                                      size="sm"
                                      colorScheme={network?.color || 'blue'}
                                      variant="solid"
                                      rightIcon={<ExternalLinkIcon />}
                                    >
                                      View on {network?.name || 'Explorer'}
                                    </Button>
                                  </Link>
                                )}
                              </Flex>
                            );
                          })}
                        </VStack>
                      )}

                      {!spendResult.success && (
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="red.600"
                          _dark={{ color: 'red.400' }}
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                        >
                          {spendResult.message}
                        </Text>
                      )}
                    </Box>
                  )}
                </VStack>
              )}
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}

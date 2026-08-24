import { createBaseAccountSDK } from '@base-org/account';
import { CopyIcon, DeleteIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Input,
  Link,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { numberToHex } from 'viem';
import { SmartAccount } from 'viem/account-abstraction';
import { base } from 'viem/chains';
import { abi } from '../../../constants';
import type { StoredAccount } from '../../../utils/unsafe_manageMultipleAccounts';
import { AddGlobalOwner } from './AddGlobalOwner';
import { DeploySubAccount } from './DeploySubAccount';

type AccountsListProps = {
  accounts: Array<{
    stored: StoredAccount;
    smartAccount: SmartAccount;
    isDeployed: boolean;
  }>;
  sdk: ReturnType<typeof createBaseAccountSDK>;
  onAddAccount: () => void;
  onRemoveAccount: (id: string) => void;
  onAccountDeployed: (id: string) => void;
};

export function AccountsList({
  accounts,
  sdk,
  onAddAccount,
  onRemoveAccount,
  onAccountDeployed,
}: AccountsListProps) {
  const toast = useToast();
  const [importingAccountId, setImportingAccountId] = useState<string | null>(null);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [ownershipStatus, setOwnershipStatus] = useState<Record<string, boolean>>({});
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  // Get connected address
  useEffect(() => {
    const getConnectedAddress = async () => {
      if (!sdk) return;

      try {
        const provider = sdk.getProvider();
        const addresses = (await provider.request({
          method: 'eth_accounts',
        })) as string[];
        if (addresses && addresses.length > 0) {
          setConnectedAddress(addresses[0]);
        }
      } catch (error) {
        console.error('Failed to get connected address:', error);
      }
    };

    getConnectedAddress();
  }, [sdk]);

  // Check ownership for deployed accounts
  useEffect(() => {
    const checkOwnership = async () => {
      if (!connectedAddress) return;

      const newOwnershipStatus: Record<string, boolean> = {};

      await Promise.all(
        accounts.map(async (account) => {
          if (!account.isDeployed) {
            // Undeployed accounts don't have ownership yet
            newOwnershipStatus[account.stored.id] = false;
            return;
          }

          try {
            // @ts-ignore - viem type inference issue with SmartAccount client
            const isOwner = (await account.smartAccount.client.readContract({
              address: account.smartAccount.address,
              abi,
              functionName: 'isOwnerAddress',
              args: [connectedAddress as `0x${string}`],
            })) as boolean;

            newOwnershipStatus[account.stored.id] = isOwner;
          } catch (error) {
            console.error(`Failed to check ownership for ${account.smartAccount.address}:`, error);
            newOwnershipStatus[account.stored.id] = false;
          }
        })
      );

      setOwnershipStatus(newOwnershipStatus);
    };

    checkOwnership();
  }, [accounts, connectedAddress]);

  const handleImportAccount = useCallback(
    async (account: (typeof accounts)[0]) => {
      if (!sdk) {
        toast({
          title: 'SDK not initialized',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      setImportingAccountId(account.stored.id);

      try {
        const provider = sdk.getProvider();
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: numberToHex(8453) }],
        });

        const customLabel = customLabels[account.stored.id] || '';

        if (account.isDeployed) {
          // Import as deployed
          const response = (await provider.request({
            method: 'wallet_addSubAccount',
            params: [
              {
                version: '1',
                account: {
                  type: 'deployed',
                  address: account.smartAccount.address,
                  chainId: base.id,
                  ...(customLabel && { label: customLabel }),
                },
              },
            ],
          })) as { address: string };

          toast({
            title: 'Deployed account imported',
            description: `Address: ${response.address}${
              customLabel ? `\nLabel: ${customLabel}` : ''
            }`,
            status: 'success',
            duration: 5000,
          });
        } else {
          // Import as undeployed
          const factoryArgs = await account.smartAccount.getFactoryArgs();
          const response = (await provider.request({
            method: 'wallet_addSubAccount',
            params: [
              {
                version: '1',
                account: {
                  type: 'undeployed',
                  address: account.smartAccount.address,
                  factory: factoryArgs?.factory,
                  factoryData: factoryArgs?.factoryData,
                  ...(customLabel && { label: customLabel }),
                },
              },
            ],
          })) as { address: string };

          toast({
            title: 'Undeployed account imported',
            description: `Address: ${response.address}${
              customLabel ? `\nLabel: ${customLabel}` : ''
            }`,
            status: 'success',
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Failed to import account:', error);
        toast({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setImportingAccountId(null);
      }
    },
    [sdk, customLabels, toast]
  );

  const handleLabelChange = useCallback((accountId: string, label: string) => {
    setCustomLabels((prev) => ({
      ...prev,
      [accountId]: label,
    }));
  }, []);

  const handleOwnerAdded = useCallback(
    async (accountId: string) => {
      if (!connectedAddress) return;

      // Re-check ownership status for this account
      const account = accounts.find((acc) => acc.stored.id === accountId);
      if (!account || !account.isDeployed) return;

      try {
        // @ts-ignore - viem type inference issue with SmartAccount client
        const isOwner = (await account.smartAccount.client.readContract({
          address: account.smartAccount.address,
          abi,
          functionName: 'isOwnerAddress',
          args: [connectedAddress as `0x${string}`],
        })) as boolean;

        setOwnershipStatus((prev) => ({
          ...prev,
          [accountId]: isOwner,
        }));

        if (isOwner) {
          toast({
            title: 'Owner added successfully',
            description: 'You can now import this account',
            status: 'success',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Failed to re-check ownership:', error);
      }
    },
    [accounts, connectedAddress, toast]
  );

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = useCallback(
    (address: string) => {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Address copied',
        description: address,
        status: 'success',
        duration: 2000,
      });
    },
    [toast]
  );

  return (
    <VStack w="full" spacing={4} align="stretch">
      <HStack justify="space-between">
        <HStack spacing={2}>
          <Text fontSize="lg" fontWeight="bold">
            Test Sub Accounts ({accounts.length})
          </Text>
          <Link
            href="https://docs.base.org/base-account/improve-ux/sub-accounts"
            isExternal
            color="blue.500"
            fontSize="sm"
          >
            Docs <ExternalLinkIcon mx="2px" />
          </Link>
        </HStack>
        <Button size="sm" colorScheme="green" onClick={onAddAccount}>
          + Generate New Account
        </Button>
      </HStack>

      {accounts.length === 0 ? (
        <Box p={4} bg="gray.50" borderRadius="md" textAlign="center" _dark={{ bg: 'gray.800' }}>
          <Text color="gray.600" _dark={{ color: 'gray.400' }}>
            No test accounts yet. Click "Generate New Account" to create one.
          </Text>
        </Box>
      ) : (
        accounts.map((account, index) => (
          <Box
            key={account.stored.id}
            p={4}
            bg="white"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}
          >
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <HStack>
                  <Text fontWeight="bold" fontSize="sm">
                    Account #{index + 1}
                  </Text>
                  <Badge colorScheme={account.isDeployed ? 'green' : 'orange'}>
                    {account.isDeployed ? 'Deployed' : 'Undeployed'}
                  </Badge>
                </HStack>
                <IconButton
                  aria-label="Delete account"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => onRemoveAccount(account.stored.id)}
                />
              </HStack>

              <Box>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  Address
                </Text>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontFamily="mono">
                    {truncateAddress(account.smartAccount.address)}
                  </Text>
                  <IconButton
                    aria-label="Copy address"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopyAddress(account.smartAccount.address)}
                  />
                </HStack>
              </Box>

              <Box>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  Chain
                </Text>
                <HStack spacing={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Base
                  </Text>
                  <Badge colorScheme="purple" fontSize="xs">
                    {base.id}
                  </Badge>
                </HStack>
              </Box>

              <Divider />

              <VStack spacing={2}>
                <Input
                  size="sm"
                  placeholder="Custom label (e.g., Trading Account)"
                  value={customLabels[account.stored.id] || ''}
                  onChange={(e) => handleLabelChange(account.stored.id, e.target.value)}
                  bg="gray.50"
                  _dark={{ bg: 'gray.800' }}
                />

                {!account.isDeployed && (
                  <DeploySubAccount
                    sdk={sdk}
                    subAccount={account.smartAccount}
                    onDeployed={() => onAccountDeployed(account.stored.id)}
                  />
                )}

                {account.isDeployed && !ownershipStatus[account.stored.id] && (
                  <>
                    <Box
                      w="full"
                      p={2}
                      bg="orange.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.200"
                      _dark={{ bg: 'orange.900', borderColor: 'orange.700' }}
                    >
                      <Text fontSize="xs" color="orange.800" _dark={{ color: 'orange.200' }}>
                        ⚠️ Connected address is not an owner. Add yourself as an owner first.
                      </Text>
                    </Box>
                    <AddGlobalOwner
                      sdk={sdk}
                      subAccount={account.smartAccount}
                      onOwnerAdded={() => handleOwnerAdded(account.stored.id)}
                    />
                  </>
                )}

                <Button
                  w="full"
                  size="sm"
                  colorScheme="blue"
                  onClick={() => handleImportAccount(account)}
                  isLoading={importingAccountId === account.stored.id}
                  loadingText="Importing..."
                  isDisabled={account.isDeployed && !ownershipStatus[account.stored.id]}
                >
                  Import to Wallet
                  {customLabels[account.stored.id] && ` as "${customLabels[account.stored.id]}"`}
                </Button>
              </VStack>
            </VStack>
          </Box>
        ))
      )}
    </VStack>
  );
}

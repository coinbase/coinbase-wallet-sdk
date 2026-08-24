import { createBaseAccountSDK } from '@base-org/account';
import { Alert, AlertIcon, Button, Container, Divider, Text, VStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Client, createPublicClient, http } from 'viem';
import { SmartAccount, toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

import { useConfig } from '../../context/ConfigContextProvider';
import {
  type StoredAccount,
  unsafe_manageMultipleAccounts,
} from '../../utils/unsafe_manageMultipleAccounts';
import { AccountsList } from './components/AccountsList';
import { Connect } from './components/Connect';

export default function SubAccounts() {
  const { scwUrl } = useConfig();
  const [sdk, setSDK] = useState<ReturnType<typeof createBaseAccountSDK>>();
  const [accounts, setAccounts] = useState<
    Array<{
      stored: StoredAccount;
      smartAccount: SmartAccount;
      isDeployed: boolean;
    }>
  >([]);

  const accountManager = unsafe_manageMultipleAccounts();

  async function createSmartAccount(stored: StoredAccount) {
    const account = privateKeyToAccount(stored.privateKey);
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    const smartAccount = await toCoinbaseSmartAccount({
      client: client as Client,
      owners: [account],
    });

    const isDeployed = await smartAccount.isDeployed();

    return {
      stored,
      smartAccount,
      isDeployed,
    };
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: accountManager and createSmartAccount are stable
  const loadAccounts = useCallback(async () => {
    const storedAccounts = accountManager.getAll();

    // If no accounts exist, create one default account
    if (storedAccounts.length === 0) {
      const newAccount = accountManager.add('Default Account');
      storedAccounts.push(newAccount);
    }

    const accountsWithSmart = await Promise.all(
      storedAccounts.map((stored) => createSmartAccount(stored))
    );

    setAccounts(accountsWithSmart);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: accountManager and createSmartAccount are stable
  const handleAddAccount = useCallback(async () => {
    const newStored = accountManager.add();
    const newAccount = await createSmartAccount(newStored);
    setAccounts((prev) => [...prev, newAccount]);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: accountManager is stable
  const handleRemoveAccount = useCallback((id: string) => {
    accountManager.remove(id);
    setAccounts((prev) => prev.filter((acc) => acc.stored.id !== id));
  }, []);

  const handleAccountDeployed = useCallback((id: string) => {
    // Update deployment status immediately after successful deployment
    setAccounts((prev) => {
      const accountIndex = prev.findIndex((acc) => acc.stored.id === id);
      if (accountIndex === -1) return prev;

      const updated = [...prev];
      updated[accountIndex] = { ...updated[accountIndex], isDeployed: true };
      return updated;
    });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: accountManager is stable
  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all test accounts?')) {
      accountManager.clear();
      setAccounts([]);
      // Reload to create default account
      loadAccounts();
    }
  }, [loadAccounts]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: no dep
  useEffect(() => {
    // THIS IS NOT SAFE, THIS IS ONLY FOR TESTING
    // IN A REAL APP YOU SHOULD NOT STORE/EXPOSE PRIVATE KEYS

    // Get first account for SDK initialization
    let storedAccounts = accountManager.getAll();
    if (storedAccounts.length === 0) {
      accountManager.add('Default Account');
      storedAccounts = accountManager.getAll();
    }

    const firstAccount = privateKeyToAccount(storedAccounts[0].privateKey);

    const sdk = createBaseAccountSDK({
      appName: 'CryptoPlayground',
      preference: {
        walletUrl: scwUrl,
        options: 'smartWalletOnly',
      },
      subAccounts: {
        toOwnerAccount: () => Promise.resolve({ account: firstAccount }),
      },
    });

    if (!sdk) {
      return;
    }

    setSDK(sdk);
    const provider = sdk.getProvider();

    provider.on('accountsChanged', (accounts) => {
      console.info('accountsChanged', accounts);
    });

    // Load all accounts
    loadAccounts();
  }, [scwUrl, loadAccounts]);

  return (
    <Container maxW="container.md" mb={16}>
      <Text fontSize="3xl" fontWeight="bold" mb={4}>
        Import Multiple Sub Accounts
      </Text>

      <Alert status="info" mb={4} borderRadius="md">
        <AlertIcon />
        Test importing multiple sub accounts with custom labels. Each account can be deployed
        separately and imported with a unique label.
      </Alert>

      <VStack w="full" spacing={6}>
        <Connect sdk={sdk} />

        <Divider />

        <AccountsList
          accounts={accounts}
          sdk={sdk}
          onAddAccount={handleAddAccount}
          onRemoveAccount={handleRemoveAccount}
          onAccountDeployed={handleAccountDeployed}
        />

        {accounts.length > 0 && (
          <Button w="full" size="sm" variant="outline" colorScheme="red" onClick={handleClearAll}>
            Clear All Test Accounts
          </Button>
        )}
      </VStack>
    </Container>
  );
}

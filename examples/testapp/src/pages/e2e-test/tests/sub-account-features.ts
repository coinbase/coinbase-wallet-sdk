/**
 * Sub-Account Features Tests
 *
 * Tests for sub-account creation, management, and operations including
 * creating sub-accounts, retrieving them, and performing operations with them.
 */

import { http, createPublicClient, toHex } from 'viem';
import { base } from 'viem/chains';
import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

const DEFAULT_PAYMASTER_URL =
  'https://api.developer.coinbase.com/rpc/v1/base/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O';

/**
 * Test creating a sub-account with wallet_addSubAccount
 */
export async function testCreateSubAccount(
  handlers: TestHandlers,
  context: TestContext
): Promise<{ address: string } | undefined> {
  // Check if getCryptoKeyAccount is available (local SDK only)
  if (!context.loadedSDK.getCryptoKeyAccount) {
    handlers.updateTestStatus(
      'Sub-Account Features',
      'wallet_addSubAccount',
      'skipped',
      'getCryptoKeyAccount not available (local SDK only)'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Sub-Account Features',
      name: 'wallet_addSubAccount',
      requiresProvider: true,
      requiresSDK: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      // Get or create a signer using getCryptoKeyAccount
      const { account } = await ctx.loadedSDK.getCryptoKeyAccount!();

      if (!account) {
        throw new Error('Could not get owner account from getCryptoKeyAccount');
      }

      const accountType = account.type as string;

      // Switch to Base
      await ctx.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // 8453 in hex
      });

      // Prepare keys
      const keys =
        accountType === 'webAuthn'
          ? [{ type: 'webauthn-p256', publicKey: account.publicKey }]
          : [{ type: 'address', publicKey: account.address }];

      // Create sub-account with keys
      const response = (await ctx.provider.request({
        method: 'wallet_addSubAccount',
        params: [
          {
            version: '1',
            account: {
              type: 'create',
              keys,
            },
          },
        ],
      })) as { address: string };

      if (!response || !response.address) {
        throw new Error('wallet_addSubAccount returned invalid response (no address)');
      }

      return response;
    },
    handlers,
    context
  );
}

/**
 * Test retrieving sub-accounts with wallet_getSubAccounts
 */
export async function testGetSubAccounts(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check if sub-account address is available
  if (!context.subAccountAddress) {
    handlers.updateTestStatus(
      'Sub-Account Features',
      'wallet_getSubAccounts',
      'skipped',
      'No sub-account available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Sub-Account Features',
      name: 'wallet_getSubAccounts',
      requiresProvider: true,
    },
    async (ctx) => {
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      if (!accounts || accounts.length < 2) {
        throw new Error('No sub-account found in accounts list');
      }

      const response = (await ctx.provider.request({
        method: 'wallet_getSubAccounts',
        params: [
          {
            account: accounts[1],
            domain: window.location.origin,
          },
        ],
      })) as { subAccounts: Array<{ address: string; factory: string; factoryData: string }> };

      const subAccounts = response.subAccounts || [];
      const addresses = subAccounts.map((sa) => sa.address);

      return { ...response, addresses };
    },
    handlers,
    context
  );
}

/**
 * Test signing with a sub-account using personal_sign
 */
export async function testSignWithSubAccount(
  handlers: TestHandlers,
  context: TestContext
): Promise<{ signature: string; isValid: boolean } | undefined> {
  // Check if sub-account address is available
  if (!context.subAccountAddress) {
    handlers.updateTestStatus(
      'Sub-Account Features',
      'personal_sign (sub-account)',
      'skipped',
      'No sub-account available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Sub-Account Features',
      name: 'personal_sign (sub-account)',
      requiresProvider: true,
      requiresUserInteraction: false,
    },
    async (ctx) => {
      const message = 'Hello from sub-account!';
      const signature = (await ctx.provider.request({
        method: 'personal_sign',
        params: [toHex(message), ctx.subAccountAddress!],
      })) as string;

      // Verify signature
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const isValid = await publicClient.verifyMessage({
        address: ctx.subAccountAddress! as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        throw new Error('Signature verification failed');
      }

      return { signature, isValid };
    },
    handlers,
    context
  );
}

/**
 * Test sending calls from a sub-account with wallet_sendCalls
 */
export async function testSendCallsFromSubAccount(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check if sub-account address is available
  if (!context.subAccountAddress) {
    handlers.updateTestStatus(
      'Sub-Account Features',
      'wallet_sendCalls (sub-account)',
      'skipped',
      'No sub-account available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Sub-Account Features',
      name: 'wallet_sendCalls (sub-account)',
      requiresProvider: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const result = (await ctx.provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: '0x2105', // Base
            from: ctx.subAccountAddress!,
            calls: [
              {
                to: '0x000000000000000000000000000000000000dead',
                data: '0x',
                value: '0x0',
              },
            ],
            capabilities: {
              paymasterService: {
                url: DEFAULT_PAYMASTER_URL,
              },
            },
          },
        ],
      })) as string;

      // Validate the result
      if (!result) {
        throw new Error('wallet_sendCalls returned empty response');
      }

      // Check if the result is an error message instead of a transaction hash
      if (typeof result === 'string' && result.toLowerCase().includes('error')) {
        throw new Error(result);
      }

      // Validate transaction hash format (should start with 0x)
      if (typeof result === 'string' && !result.startsWith('0x')) {
        throw new Error(`Invalid transaction hash format: ${result}`);
      }

      return { txHash: result };
    },
    handlers,
    context
  );
}

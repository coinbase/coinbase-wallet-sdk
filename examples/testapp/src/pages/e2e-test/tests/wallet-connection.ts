import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test wallet connection via eth_requestAccounts
 */
export async function testConnectWallet(
  handlers: TestHandlers,
  context: TestContext
): Promise<string[] | undefined> {
  return runTest(
    {
      category: 'Wallet Connection',
      name: 'Connect wallet',
      requiresProvider: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const accounts = (await ctx.provider.request({
        method: 'eth_requestAccounts',
        params: [],
      })) as string[];

      if (accounts && accounts.length > 0) {
        return accounts;
      }

      throw new Error('No accounts returned');
    },
    handlers,
    context
  );
}

/**
 * Test retrieving accounts via eth_accounts
 */
export async function testGetAccounts(
  handlers: TestHandlers,
  context: TestContext
): Promise<string[] | undefined> {
  return runTest(
    {
      category: 'Wallet Connection',
      name: 'Get accounts',
      requiresProvider: true,
    },
    async (ctx) => {
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      return accounts;
    },
    handlers,
    context
  );
}

/**
 * Test retrieving chain ID via eth_chainId
 */
export async function testGetChainId(
  handlers: TestHandlers,
  context: TestContext
): Promise<number | undefined> {
  return runTest(
    {
      category: 'Wallet Connection',
      name: 'Get chain ID',
      requiresProvider: true,
    },
    async (ctx) => {
      const chainIdHex = (await ctx.provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;

      const chainIdNum = Number.parseInt(chainIdHex, 16);

      return chainIdNum;
    },
    handlers,
    context
  );
}

/**
 * Test signing a message with personal_sign
 */
export async function testSignMessage(
  handlers: TestHandlers,
  context: TestContext
): Promise<string | undefined> {
  return runTest(
    {
      category: 'Wallet Connection',
      name: 'Sign message (personal_sign)',
      requiresProvider: true,
      requiresConnection: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      const account = accounts[0];
      const message = 'Hello from Coinbase Wallet SDK E2E Test!';

      const signature = (await ctx.provider.request({
        method: 'personal_sign',
        params: [message, account],
      })) as string;

      return signature;
    },
    handlers,
    context
  );
}

/**
 * Sign & Send Tests
 *
 * Tests for signing typed data and sending transactions/calls.
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test signing typed data with eth_signTypedData_v4
 */
export async function testSignTypedData(
  handlers: TestHandlers,
  context: TestContext
): Promise<string | undefined> {
  return runTest(
    {
      category: 'Sign & Send',
      name: 'eth_signTypedData_v4',
      requiresProvider: true,
      requiresConnection: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      // Get current account and chain ID
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      const account = accounts[0];

      const chainIdHex = (await ctx.provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;
      const chainIdNum = Number.parseInt(chainIdHex, 16);

      const typedData = {
        domain: {
          name: 'E2E Test',
          version: '1',
          chainId: chainIdNum,
        },
        types: {
          TestMessage: [{ name: 'message', type: 'string' }],
        },
        primaryType: 'TestMessage',
        message: {
          message: 'Hello from E2E tests!',
        },
      };

      const signature = (await ctx.provider.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(typedData)],
      })) as string;

      return signature;
    },
    handlers,
    context
  );
}

/**
 * Test sending calls with wallet_sendCalls
 */
export async function testWalletSendCalls(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  return runTest(
    {
      category: 'Sign & Send',
      name: 'wallet_sendCalls',
      requiresProvider: true,
      requiresConnection: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      // Get current account and chain ID
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      const account = accounts[0];

      const chainIdHex = (await ctx.provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;
      const chainIdNum = Number.parseInt(chainIdHex, 16);

      const result = await ctx.provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0.0',
            from: account,
            chainId: `0x${chainIdNum.toString(16)}`,
            calls: [
              {
                to: '0x0000000000000000000000000000000000000001',
                data: '0x',
                value: '0x0',
              },
            ],
          },
        ],
      });

      return result;
    },
    handlers,
    context
  );
}

/**
 * Test preparing calls with wallet_prepareCalls
 */
export async function testWalletPrepareCalls(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  return runTest(
    {
      category: 'Sign & Send',
      name: 'wallet_prepareCalls',
      requiresProvider: true,
      requiresConnection: true,
      requiresUserInteraction: false, // wallet_prepareCalls doesn't open a popup
    },
    async (ctx) => {
      // Get current account and chain ID
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      const account = accounts[0];

      const chainIdHex = (await ctx.provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;
      const chainIdNum = Number.parseInt(chainIdHex, 16);

      const result = await ctx.provider.request({
        method: 'wallet_prepareCalls',
        params: [
          {
            version: '2.0.0',
            from: account,
            chainId: `0x${chainIdNum.toString(16)}`,
            calls: [
              {
                to: '0x0000000000000000000000000000000000000001',
                data: '0x',
                value: '0x0',
              },
            ],
          },
        ],
      });

      return result;
    },
    handlers,
    context
  );
}

/**
 * Spend Permission Tests
 *
 * Tests for spend permission functionality including requesting permissions,
 * fetching permissions, and preparing spend/revoke call data.
 */

import { parseUnits } from 'viem';
import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test requesting a spend permission
 */
export async function testRequestSpendPermission(
  handlers: TestHandlers,
  context: TestContext
): Promise<{ permissionHash: string } | undefined> {
  // Check if spendPermission API is available (only works with local SDK, not npm CDN)
  if (!context.loadedSDK.spendPermission?.requestSpendPermission) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.requestSpendPermission()',
      'skipped',
      'Spend permission API not available (only works with local SDK)'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Spend Permissions',
      name: 'spendPermission.requestSpendPermission()',
      requiresProvider: true,
      requiresSDK: true,
      requiresConnection: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const accounts = (await ctx.provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      const account = accounts[0];

      // Check if TOKENS are available
      if (!ctx.loadedSDK.TOKENS?.USDC?.addresses?.base) {
        throw new Error('TOKENS.USDC not available');
      }

      const permission = await ctx.loadedSDK.spendPermission.requestSpendPermission({
        provider: ctx.provider,
        account,
        spender: '0x0000000000000000000000000000000000000001',
        token: ctx.loadedSDK.TOKENS.USDC.addresses.base,
        chainId: 8453,
        allowance: parseUnits('100', 6),
        periodInDays: 30,
      });

      return permission;
    },
    handlers,
    context
  );
}

/**
 * Test getting permission status
 */
export async function testGetPermissionStatus(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check prerequisites
  if (!context.permissionHash) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.getPermissionStatus()',
      'skipped',
      'No permission hash available'
    );
    return undefined;
  }

  if (
    !context.loadedSDK.spendPermission?.getPermissionStatus ||
    !context.loadedSDK.spendPermission?.fetchPermission
  ) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.getPermissionStatus()',
      'skipped',
      'Spend permission API not available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Spend Permissions',
      name: 'spendPermission.getPermissionStatus()',
      requiresSDK: true,
    },
    async (ctx) => {
      // First fetch the full permission object (which includes chainId)
      const permission = await ctx.loadedSDK.spendPermission!.fetchPermission({
        permissionHash: ctx.permissionHash!,
      });

      if (!permission) {
        throw new Error('Permission not found');
      }

      // Now get the status using the full permission object
      const status = await ctx.loadedSDK.spendPermission!.getPermissionStatus(permission);

      return status;
    },
    handlers,
    context
  );
}

/**
 * Test fetching a single permission
 */
export async function testFetchPermission(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check prerequisites
  if (!context.permissionHash) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.fetchPermission()',
      'skipped',
      'No permission hash available'
    );
    return undefined;
  }

  if (!context.loadedSDK.spendPermission?.fetchPermission) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.fetchPermission()',
      'skipped',
      'Spend permission API not available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Spend Permissions',
      name: 'spendPermission.fetchPermission()',
      requiresSDK: true,
    },
    async (ctx) => {
      const permission = await ctx.loadedSDK.spendPermission!.fetchPermission({
        permissionHash: ctx.permissionHash!,
      });

      if (permission) {
        return permission;
      }

      throw new Error('Permission not found');
    },
    handlers,
    context
  );
}

/**
 * Test fetching all permissions for an account
 */
export async function testFetchPermissions(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown[]> {
  // Check if spendPermission API is available
  if (!context.loadedSDK.spendPermission?.fetchPermissions) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.fetchPermissions()',
      'skipped',
      'Spend permission API not available'
    );
    return [];
  }

  return (
    runTest(
      {
        category: 'Spend Permissions',
        name: 'spendPermission.fetchPermissions()',
        requiresProvider: true,
        requiresSDK: true,
        requiresConnection: true,
      },
      async (ctx) => {
        const accounts = (await ctx.provider.request({
          method: 'eth_accounts',
          params: [],
        })) as string[];

        const account = accounts[0];

        // fetchPermissions requires a spender parameter - use the same one we used in requestSpendPermission
        const permissions = await ctx.loadedSDK.spendPermission!.fetchPermissions({
          provider: ctx.provider,
          account,
          spender: '0x0000000000000000000000000000000000000001',
          chainId: 8453,
        });

        return permissions;
      },
      handlers,
      context
    ) || []
  );
}

/**
 * Test preparing spend call data
 */
export async function testPrepareSpendCallData(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check prerequisites
  if (!context.permissionHash) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.prepareSpendCallData()',
      'skipped',
      'No permission hash available'
    );
    return undefined;
  }

  if (
    !context.loadedSDK.spendPermission?.prepareSpendCallData ||
    !context.loadedSDK.spendPermission?.fetchPermission
  ) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.prepareSpendCallData()',
      'skipped',
      'Spend permission API not available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Spend Permissions',
      name: 'spendPermission.prepareSpendCallData()',
      requiresSDK: true,
    },
    async (ctx) => {
      const permission = await ctx.loadedSDK.spendPermission!.fetchPermission({
        permissionHash: ctx.permissionHash!,
      });

      if (!permission) {
        throw new Error('Permission not found');
      }

      const callData = await ctx.loadedSDK.spendPermission!.prepareSpendCallData(
        permission,
        parseUnits('10', 6)
      );

      return callData;
    },
    handlers,
    context
  );
}

/**
 * Test preparing revoke call data
 */
export async function testPrepareRevokeCallData(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check prerequisites
  if (!context.permissionHash) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.prepareRevokeCallData()',
      'skipped',
      'No permission hash available'
    );
    return undefined;
  }

  if (
    !context.loadedSDK.spendPermission?.prepareRevokeCallData ||
    !context.loadedSDK.spendPermission?.fetchPermission
  ) {
    handlers.updateTestStatus(
      'Spend Permissions',
      'spendPermission.prepareRevokeCallData()',
      'skipped',
      'Spend permission API not available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Spend Permissions',
      name: 'spendPermission.prepareRevokeCallData()',
      requiresSDK: true,
    },
    async (ctx) => {
      const permission = await ctx.loadedSDK.spendPermission!.fetchPermission({
        permissionHash: ctx.permissionHash!,
      });

      if (!permission) {
        throw new Error('Permission not found');
      }

      const callData = await ctx.loadedSDK.spendPermission!.prepareRevokeCallData(permission);

      return callData;
    },
    handlers,
    context
  );
}

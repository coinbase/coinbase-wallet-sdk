import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import type { Address } from 'viem';

export type PermissionAuthorizationChecks = {
  /** If set, must equal the subscription spender (subscription owner). */
  expectedSpender?: Address | string;
  /** If set, must equal the subscription payer (subscriber account). */
  expectedPayer?: Address | string;
};

/**
 * Asserts that a spend permission matches optional expected spender/payer addresses.
 *
 * Use this when a subscription ID comes from an untrusted source (e.g. a browser client)
 * so callers can bind the permission to a known subscription owner and/or subscriber.
 */
export function assertPermissionAuthorization(
  permission: SpendPermission,
  checks: PermissionAuthorizationChecks
): void {
  const { expectedSpender, expectedPayer } = checks;

  if (expectedSpender) {
    const actualSpender = permission.permission.spender;
    if (actualSpender.toLowerCase() !== expectedSpender.toLowerCase()) {
      throw new Error(
        `Subscription spender ${actualSpender} does not match expected spender ${expectedSpender}`
      );
    }
  }

  if (expectedPayer) {
    const actualPayer = permission.permission.account;
    if (actualPayer.toLowerCase() !== expectedPayer.toLowerCase()) {
      throw new Error(
        `Subscription payer ${actualPayer} does not match expected payer ${expectedPayer}`
      );
    }
  }
}

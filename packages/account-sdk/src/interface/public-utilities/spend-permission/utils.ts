import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { spendPermissionManagerAddress } from ':core/sub-account/constants.js';
import { Address, Hex, getAddress } from 'viem';
import { RequestSpendPermissionType } from './methods/requestSpendPermission.js';

const ETERNITY_TIMESTAMP = 281474976710655; // 2^48 - 1

const SPEND_PERMISSION_TYPED_DATA_TYPES = {
  SpendPermission: [
    {
      name: 'account',
      type: 'address',
    },
    {
      name: 'spender',
      type: 'address',
    },
    {
      name: 'token',
      type: 'address',
    },
    {
      name: 'allowance',
      type: 'uint160',
    },
    {
      name: 'period',
      type: 'uint48',
    },
    {
      name: 'start',
      type: 'uint48',
    },
    {
      name: 'end',
      type: 'uint48',
    },
    {
      name: 'salt',
      type: 'uint256',
    },
    {
      name: 'extraData',
      type: 'bytes',
    },
  ],
};

export type SpendPermissionTypedData = {
  domain: {
    name: 'Spend Permission Manager';
    version: '1';
    chainId: number;
    verifyingContract: typeof spendPermissionManagerAddress;
  };
  types: typeof SPEND_PERMISSION_TYPED_DATA_TYPES;
  primaryType: 'SpendPermission';
  message: {
    account: Address;
    spender: Address;
    token: Address;
    allowance: string;
    period: number;
    start: number;
    end: number;
    salt: string;
    extraData: Hex;
  };
};

export function createSpendPermissionTypedData(
  request: RequestSpendPermissionType
): SpendPermissionTypedData {
  const { account, spender, token, chainId, allowance, periodInDays, start, end, salt, extraData } =
    request;

  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId: chainId,
      verifyingContract: spendPermissionManagerAddress,
    },
    types: SPEND_PERMISSION_TYPED_DATA_TYPES,
    primaryType: 'SpendPermission',
    message: {
      account: getAddress(account),
      spender: getAddress(spender),
      token: getAddress(token),
      allowance: allowance.toString(),
      period: 86400 * periodInDays,
      start: dateToTimestampInSeconds(start ?? new Date()),
      end: end ? dateToTimestampInSeconds(end) : ETERNITY_TIMESTAMP,
      salt: salt ?? getRandomHexString(32),
      extraData: extraData ? (extraData as Hex) : '0x',
    },
  };
}

/**
 * TEST ONLY: Creates a spend permission with period in seconds instead of days.
 * ⚠️ WARNING: This function should ONLY be used for testing purposes on testnet.
 * Using this in production scenarios is not supported and may lead to unexpected behavior.
 *
 * @testOnly
 * @param request - The request parameters with periodInSeconds instead of periodInDays
 * @returns SpendPermissionTypedData
 */
export function createSpendPermissionTypedDataWithSeconds(
  request: Omit<RequestSpendPermissionType, 'periodInDays'> & { periodInSeconds: number }
): SpendPermissionTypedData {
  const {
    account,
    spender,
    token,
    chainId,
    allowance,
    periodInSeconds,
    start,
    end,
    salt,
    extraData,
  } = request;

  // Runtime check to prevent misuse
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️ createSpendPermissionTypedDataWithSeconds is being used. ' +
        'This function is intended for testing purposes only.'
    );
  }

  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId: chainId,
      verifyingContract: spendPermissionManagerAddress,
    },
    types: SPEND_PERMISSION_TYPED_DATA_TYPES,
    primaryType: 'SpendPermission',
    message: {
      account: getAddress(account),
      spender: getAddress(spender),
      token: getAddress(token),
      allowance: allowance.toString(),
      period: periodInSeconds, // Direct seconds value for testing
      start: dateToTimestampInSeconds(start ?? new Date()),
      end: end ? dateToTimestampInSeconds(end) : ETERNITY_TIMESTAMP,
      salt: salt ?? getRandomHexString(32),
      extraData: extraData ? (extraData as Hex) : '0x',
    },
  };
}

function getRandomHexString(byteLength: number): `0x${string}` {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  const hexString = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `0x${hexString}`;
}

/**
 * Converts a JavaScript Date object to a Unix timestamp in seconds.
 *
 * @param date - The Date object to convert.
 * @returns The Unix timestamp in seconds.
 */
export function dateToTimestampInSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**

 * Converts a Unix timestamp in seconds to a Date object.
 *
 * @param timestamp - The Unix timestamp in seconds.
 * @returns A Date object.
 */
export function timestampInSecondsToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Calculates the current period for a spend permission based on the permission parameters.
 *
 * This function computes which period we're currently in based on the permission's start time,
 * period duration, and the current time. It's useful when there's no on-chain state yet.
 *
 * @param permission - The SpendPermission object to calculate the period for
 * @param currentTimestamp - Optional timestamp to use as "now" (defaults to current time)
 * @returns The current period with start, end, and spend (0 for inferred periods)
 */
export function calculateCurrentPeriod(
  permission: SpendPermission,
  currentTimestamp?: number
): {
  start: number;
  end: number;
  spend: bigint;
} {
  const now = currentTimestamp ?? Math.floor(Date.now() / 1000);
  const { start, end, period } = permission.permission;

  const permissionStart = Number(start);
  const permissionEnd = Number(end);
  const periodDuration = Number(period);

  // If we're before the permission starts, return the first period
  if (now < permissionStart) {
    const firstPeriodEnd = permissionStart + periodDuration;
    return {
      start: permissionStart,
      end: firstPeriodEnd > permissionEnd ? permissionEnd : firstPeriodEnd - 1,
      spend: BigInt(0),
    };
  }

  // If we're after the permission ends, return the last period
  if (now > permissionEnd) {
    // Calculate the start of the last period that would contain permissionEnd
    const totalDuration = permissionEnd - permissionStart;
    const completePeriods = Math.floor(totalDuration / periodDuration);
    const lastPeriodStart = permissionStart + completePeriods * periodDuration;

    // If the last period would start after permissionEnd, go back one period
    if (lastPeriodStart >= permissionEnd && completePeriods > 0) {
      return {
        start: permissionStart + (completePeriods - 1) * periodDuration,
        end: permissionEnd,
        spend: BigInt(0),
      };
    }

    return {
      start: lastPeriodStart,
      end: permissionEnd,
      spend: BigInt(0),
    };
  }

  // Calculate which period we're in
  const timeElapsed = now - permissionStart;
  const currentPeriodIndex = Math.floor(timeElapsed / periodDuration);
  const currentPeriodStart = permissionStart + currentPeriodIndex * periodDuration;
  const nextPeriodStart = currentPeriodStart + periodDuration;

  // For the last period, end should be exactly the permission end
  // For other periods, end should be nextPeriodStart - 1
  const currentPeriodEnd = nextPeriodStart >= permissionEnd ? permissionEnd : nextPeriodStart - 1;

  return {
    start: currentPeriodStart,
    end: currentPeriodEnd,
    spend: BigInt(0), // When inferring, we assume no spend has occurred
  };
}

/**
 * Converts a SpendPermission object to the arguments expected by the SpendPermissionManager contract.
 *
 * This function creates the standard args in the correct order.
 *
 * @param permission - The SpendPermission object to convert.
 * @returns The arguments expected by the SpendPermissionManager contract.
 *
 * @example
 * ```typescript
 * import { toSpendPermissionArgs } from '@base-org/account/spend-permission';
 *
 * const args = toSpendPermissionArgs(permission);
 * const currentPeriod = await readContract(client, {
 *   address: spendPermissionManagerAddress,
 *   abi: spendPermissionManagerAbi,
 *   functionName: 'getCurrentPeriod',
 *   args: [args]
 * });
 * ```
 */
export function toSpendPermissionArgs(permission: SpendPermission) {
  const {
    account,
    spender,
    token,
    allowance: allowanceStr,
    period,
    start,
    end,
    salt,
    extraData,
  } = permission.permission;

  return {
    account: getAddress(account),
    spender: getAddress(spender),
    token: getAddress(token),
    allowance: BigInt(allowanceStr),
    period,
    start,
    end,
    salt: BigInt(salt),
    extraData: extraData as Hex,
  };
}

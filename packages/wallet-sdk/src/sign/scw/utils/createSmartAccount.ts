import type { Address, TypedData } from 'abitype';
import * as Signature from 'ox/Signature';
import type * as WebAuthnP256 from 'ox/WebAuthnP256';
import {
  Assign,
  BaseError,
  type Client,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hash,
  hashMessage,
  hashTypedData,
  type Hex,
  type LocalAccount,
  type OneOf,
  parseSignature,
  type Prettify,
  size,
  stringToHex,
  type TypedDataDefinition,
} from 'viem';
import {
  entryPoint06Abi,
  entryPoint06Address,
  getUserOperationHash,
  type SmartAccount,
  type SmartAccountImplementation,
  toSmartAccount,
  type UserOperation,
  type WebAuthnAccount,
} from 'viem/account-abstraction';

import { abi, factoryAbi, factoryAddress } from './constants.js';

export type CreateSmartAccountParameters = {
  address: Address;
  client: Client;
  factoryData: Hex | undefined;
  ownerIndex: number;
  owner: OneOf<LocalAccount | WebAuthnAccount>;
};

export type CreateSmartAccountReturnType = Prettify<
  SmartAccount<CoinbaseSmartAccountImplementation>
>;

export type CoinbaseSmartAccountImplementation = Assign<
  SmartAccountImplementation<
    typeof entryPoint06Abi,
    '0.6',
    { abi: typeof abi; factory: { abi: typeof factoryAbi; address: Address } }
  >,
  {
    decodeCalls: NonNullable<SmartAccountImplementation['decodeCalls']>;
    sign: NonNullable<SmartAccountImplementation['sign']>;
  }
>;

/**
 * @description Create a Coinbase Smart Account.
 *
 * @param parameters - {@link CreateSmartAccountParameters}
 * @returns Coinbase Smart Account. {@link CreateSmartAccountReturnType}
 *
 * @example
 *
 * const account = createSmartAccount({
 *   client,
 *   owner: privateKeyToAccount('0x...'),
 *   ownerIndex: 0,
 *   address: '0x...',
 *   factoryData: '0x...',
 * })
 */
export async function createSmartAccount(
  parameters: CreateSmartAccountParameters
): Promise<CreateSmartAccountReturnType> {
  const { owner, ownerIndex, address, client, factoryData } = parameters;
  const entryPoint = {
    abi: entryPoint06Abi,
    address: entryPoint06Address,
    version: '0.6',
  } as const;
  const factory = {
    abi: factoryAbi,
    address: factoryAddress,
  } as const;

  return toSmartAccount({
    client,
    entryPoint,
    extend: { abi, factory },
    async decodeCalls(data) {
      const result = decodeFunctionData({
        abi,
        data,
      });
      if (result.functionName === 'execute')
        return [{ to: result.args[0], value: result.args[1], data: result.args[2] }];
      if (result.functionName === 'executeBatch')
        return result.args[0].map((arg) => ({
          to: arg.target,
          value: arg.value,
          data: arg.data,
        }));
      throw new BaseError(`unable to decode calls for "${result.functionName}"`);
    },

    async encodeCalls(calls) {
      if (calls.length === 1) {
        return encodeFunctionData({
          abi,
          functionName: 'execute',
          args: [calls[0].to, calls[0].value ?? BigInt(0), calls[0].data ?? '0x'],
        });
      }
      return encodeFunctionData({
        abi,
        functionName: 'executeBatch',
        args: [
          calls.map((call) => ({
            data: call.data ?? '0x',
            target: call.to,
            value: call.value ?? BigInt(0),
          })),
        ],
      });
    },

    async getAddress() {
      return address;
    },

    async getFactoryArgs() {
      if (factoryData) return { factory: factory.address, factoryData };
      // TODO: support creating factory data
      return { factory: factory.address, factoryData };
    },

    async getStubSignature() {
      if (owner.type === 'webAuthn')
        return '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000';
      return wrapSignature({
        ownerIndex,
        signature:
          '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
      });
    },

    async sign(parameters) {
      const address = await this.getAddress();

      const hash = toReplaySafeHash({
        address,
        chainId: client.chain!.id,
        hash: parameters.hash,
      });

      const signature = await sign({ hash, owner });

      return wrapSignature({
        ownerIndex,
        signature,
      });
    },

    async signMessage(parameters) {
      const { message } = parameters;
      const address = await this.getAddress();

      const hash = toReplaySafeHash({
        address,
        chainId: client.chain!.id,
        hash: hashMessage(message),
      });

      const signature = await sign({ hash, owner });

      return wrapSignature({
        ownerIndex,
        signature,
      });
    },

    async signTypedData(parameters) {
      const { domain, types, primaryType, message } = parameters as TypedDataDefinition<
        TypedData,
        string
      >;
      const address = await this.getAddress();

      const hash = toReplaySafeHash({
        address,
        chainId: client.chain!.id,
        hash: hashTypedData({
          domain,
          message,
          primaryType,
          types,
        }),
      });

      const signature = await sign({ hash, owner });

      return wrapSignature({
        ownerIndex,
        signature,
      });
    },

    async signUserOperation(parameters) {
      const { chainId = client.chain!.id, ...userOperation } = parameters;

      const address = await this.getAddress();
      const hash = getUserOperationHash({
        chainId,
        entryPointAddress: entryPoint.address,
        entryPointVersion: entryPoint.version,
        userOperation: {
          ...(userOperation as unknown as UserOperation),
          sender: address,
        },
      });

      const signature = await sign({ hash, owner });

      return wrapSignature({
        ownerIndex,
        signature,
      });
    },

    userOperation: {
      async estimateGas(userOperation) {
        if (owner.type !== 'webAuthn') return;

        // Accounts with WebAuthn owner require a minimum verification gas limit of 800,000.
        return {
          verificationGasLimit: BigInt(
            Math.max(Number(userOperation.verificationGasLimit ?? BigInt(0)), 800_000)
          ),
        };
      },
    },
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Utilities
/////////////////////////////////////////////////////////////////////////////////////////////

/** @internal */
export async function sign({
  hash,
  owner,
}: {
  hash: Hash;
  owner: OneOf<LocalAccount | WebAuthnAccount>;
}) {
  // WebAuthn Account (Passkey)
  if (owner.type === 'webAuthn') {
    const { signature, webauthn } = await owner.sign({
      hash,
    });
    return toWebAuthnSignature({ signature, webauthn });
  }

  if (owner.sign) return owner.sign({ hash });

  throw new BaseError('`owner` does not support raw sign.');
}

/** @internal */
export function toReplaySafeHash({
  address,
  chainId,
  hash,
}: {
  address: Address;
  chainId: number;
  hash: Hash;
}) {
  return hashTypedData({
    domain: {
      chainId,
      name: 'Coinbase Smart Wallet',
      verifyingContract: address,
      version: '1',
    },
    types: {
      CoinbaseSmartWalletMessage: [
        {
          name: 'hash',
          type: 'bytes32',
        },
      ],
    },
    primaryType: 'CoinbaseSmartWalletMessage',
    message: {
      hash,
    },
  });
}

/** @internal */
export function toWebAuthnSignature({
  webauthn,
  signature,
}: {
  webauthn: WebAuthnP256.SignMetadata;
  signature: Hex;
}) {
  const { r, s } = Signature.fromHex(signature);
  return encodeAbiParameters(
    [
      {
        components: [
          {
            name: 'authenticatorData',
            type: 'bytes',
          },
          { name: 'clientDataJSON', type: 'bytes' },
          { name: 'challengeIndex', type: 'uint256' },
          { name: 'typeIndex', type: 'uint256' },
          {
            name: 'r',
            type: 'uint256',
          },
          {
            name: 's',
            type: 'uint256',
          },
        ],
        type: 'tuple',
      },
    ],
    [
      {
        authenticatorData: webauthn.authenticatorData,
        clientDataJSON: stringToHex(webauthn.clientDataJSON),
        challengeIndex: BigInt(webauthn.challengeIndex),
        typeIndex: BigInt(webauthn.typeIndex),
        r,
        s,
      },
    ]
  );
}

/** @internal */
export function wrapSignature(parameters: { ownerIndex?: number | undefined; signature: Hex }) {
  const { ownerIndex = 0 } = parameters;
  const signatureData = (() => {
    if (size(parameters.signature) !== 65) return parameters.signature;
    const signature = parseSignature(parameters.signature);
    return encodePacked(
      ['bytes32', 'bytes32', 'uint8'],
      [signature.r, signature.s, signature.yParity === 0 ? 27 : 28]
    );
  })();
  return encodeAbiParameters(
    [
      {
        components: [
          {
            name: 'ownerIndex',
            type: 'uint8',
          },
          {
            name: 'signatureData',
            type: 'bytes',
          },
        ],
        type: 'tuple',
      },
    ],
    [
      {
        ownerIndex,
        signatureData,
      },
    ]
  );
}

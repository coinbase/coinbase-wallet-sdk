import { isViemError, standardErrors, viemHttpErrorToProviderError } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { PrepareCallsSchema } from ':core/rpc/wallet_prepareCalls.js';
import { SendPreparedCallsSchema } from ':core/rpc/wallet_sendPreparedCalls.js';
import { OwnerAccount } from ':core/type/index.js';
import { ensureHexString } from ':core/type/util.js';
import { SubAccount } from ':store/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { convertCredentialToJSON } from ':util/encoding.js';
import { get } from ':util/get.js';
import {
  Address,
  Hex,
  PublicClient,
  TypedDataDefinition,
  hexToString,
  isHex,
  numberToHex,
} from 'viem';
import {
  createWalletSendCallsRequest,
  injectRequestCapabilities,
  waitForCallsTransactionHash,
} from '../utils.js';
import { createSmartAccount } from './createSmartAccount.js';

type CreateSubAccountSignerParams = {
  address: Address;
  owner: OwnerAccount;
  ownerIndex?: number;
  client: PublicClient;
  parentAddress?: Address;
  factoryData?: Hex;
  factory?: Address;
  attribution?:
    | {
        suffix: Hex;
      }
    | {
        appOrigin: string;
      };
};

export async function createSubAccountSigner({
  address,
  client,
  factory,
  factoryData,
  owner,
  ownerIndex,
  parentAddress,
  attribution,
}: CreateSubAccountSignerParams) {
  const subAccount: SubAccount = {
    address,
    factory,
    factoryData,
  };

  const chainId = client.chain?.id;
  if (!chainId) {
    throw standardErrors.rpc.internal('chainId not found');
  }

  const account = await createSmartAccount({
    owner,
    ownerIndex: ownerIndex ?? 1,
    address,
    client,
    factoryData,
  });

  const request = async (args: RequestArguments) => {
    try {
      switch (args.method) {
        case 'wallet_addSubAccount':
          return subAccount;
        case 'eth_accounts':
          return [subAccount.address] as Address[];
        case 'eth_coinbase':
          return subAccount.address;
        case 'net_version':
          return chainId.toString();
        case 'eth_chainId':
          return numberToHex(chainId);
        case 'eth_sendTransaction': {
          assertArrayPresence(args.params);

          const rawParams = args.params[0] as {
            to: Address;
            data?: Hex;
            value?: Hex;
            from?: Address;
          };

          assertPresence(rawParams.to, standardErrors.rpc.invalidParams('to is required'));

          const params = {
            to: rawParams.to,
            data: ensureHexString(rawParams.data ?? '0x', true) as Hex,
            value: ensureHexString(rawParams.value ?? '0x', true) as Hex,
            from: rawParams.from ?? subAccount.address,
          };

          // Transform into wallet_sendCalls request
          const sendCallsRequest = createWalletSendCallsRequest({
            calls: [params],
            chainId,
            from: params.from,
          });

          const response = (await request(sendCallsRequest)) as string;

          return waitForCallsTransactionHash({
            client,
            id: response,
          });
        }
        case 'wallet_sendCalls': {
          assertArrayPresence(args.params);
          // Get the client for the chain
          const chainId = get(args.params[0], 'chainId');
          if (!chainId) {
            throw standardErrors.rpc.invalidParams('chainId is required');
          }

          if (!isHex(chainId)) {
            throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
          }

          if (!args.params[0]) {
            throw standardErrors.rpc.invalidParams('params are required');
          }

          if (!('calls' in args.params[0])) {
            throw standardErrors.rpc.invalidParams('calls are required');
          }

          let prepareCallsRequest: RequestArguments = {
            method: 'wallet_prepareCalls',
            params: [
              {
                version: '1.0',
                calls: args.params[0].calls as {
                  to: Address;
                  data: Hex;
                  value: Hex;
                }[],
                chainId: chainId,
                from: subAccount.address,
                capabilities:
                  'capabilities' in args.params[0]
                    ? (args.params[0].capabilities as Record<string, unknown>)
                    : {},
              },
            ],
          };

          if (parentAddress) {
            prepareCallsRequest = injectRequestCapabilities(prepareCallsRequest, {
              funding: [
                {
                  type: 'spendPermission',
                  data: {
                    autoApply: true,
                    sources: [parentAddress],
                    preference: 'PREFER_DIRECT_BALANCE',
                  },
                },
              ],
            });
          }

          let prepareCallsResponse = (await request(
            prepareCallsRequest
          )) as PrepareCallsSchema['ReturnType'];

          const signResponse = await owner!.sign?.({
            // Hash returned from wallet_prepareCalls is double hex encoded
            hash: hexToString(prepareCallsResponse.signatureRequest.hash) as `0x${string}`,
          });

          let signatureData: SendPreparedCallsSchema['Parameters'][0]['signature'];

          if (!signResponse) {
            throw standardErrors.rpc.internal('signature not found');
          }

          if (isHex(signResponse)) {
            signatureData = {
              type: 'secp256k1',
              data: {
                address: owner!.address!,
                signature: signResponse as Hex,
              },
            };
          } else {
            signatureData = {
              type: 'webauthn',
              data: {
                signature: JSON.stringify(
                  convertCredentialToJSON({
                    id: owner!.id ?? '1',
                    ...signResponse,
                  })
                ),
                publicKey: owner!.publicKey,
              },
            };
          }

          const sendPreparedCallsResponse = (await request({
            method: 'wallet_sendPreparedCalls',
            params: [
              {
                version: '1.0',
                type: prepareCallsResponse.type,
                data: prepareCallsResponse.userOp,
                chainId: prepareCallsResponse.chainId,
                signature: signatureData,
              },
            ],
          })) as SendPreparedCallsSchema['ReturnType'];

          return sendPreparedCallsResponse[0];
        }
        case 'wallet_sendPreparedCalls': {
          assertArrayPresence(args.params);
          // Get the client for the chain
          const chainId = get(args.params[0], 'chainId');
          if (!chainId) {
            throw standardErrors.rpc.invalidParams('chainId is required');
          }

          if (!isHex(chainId)) {
            throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
          }

          const sendPreparedCallsResponse = await client.request<SendPreparedCallsSchema>({
            method: 'wallet_sendPreparedCalls',
            params: args.params as SendPreparedCallsSchema['Parameters'],
          });

          return sendPreparedCallsResponse;
        }
        case 'wallet_prepareCalls': {
          assertArrayPresence(args.params);
          // Get the client for the chain
          const chainId = get(args.params[0], 'chainId');
          if (!chainId) {
            throw standardErrors.rpc.invalidParams('chainId is required');
          }

          if (!isHex(chainId)) {
            throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
          }

          if (!args.params[0]) {
            throw standardErrors.rpc.invalidParams('params are required');
          }

          if (!get(args.params[0], 'calls')) {
            throw standardErrors.rpc.invalidParams('calls are required');
          }

          const prepareCallsParams = args.params[0] as PrepareCallsSchema['Parameters'][0];

          if (
            attribution &&
            prepareCallsParams.capabilities &&
            !('attribution' in prepareCallsParams.capabilities)
          ) {
            prepareCallsParams.capabilities.attribution = attribution;
          }

          const prepareCallsResponse = await client.request<PrepareCallsSchema>({
            method: 'wallet_prepareCalls',
            params: [{ ...args.params[0], chainId: chainId }] as PrepareCallsSchema['Parameters'],
          });

          return prepareCallsResponse;
        }
        case 'personal_sign': {
          assertArrayPresence(args.params);
          // Param is expected to be a hex encoded string
          if (!isHex(args.params[0])) {
            throw standardErrors.rpc.invalidParams('message must be a hex encoded string');
          }
          // signMessage expects the unencoded message
          const message = hexToString(args.params[0] as `0x${string}`);
          return account.signMessage({ message });
        }
        case 'eth_signTypedData_v4': {
          assertArrayPresence(args.params);
          const typedData =
            typeof args.params[1] === 'string' ? JSON.parse(args.params[1]) : args.params[1];
          return account.signTypedData(typedData as TypedDataDefinition);
        }
        case 'eth_signTypedData_v1':
        case 'eth_signTypedData_v3':
        case 'wallet_addEthereumChain':
        case 'wallet_switchEthereumChain':
        default:
          throw standardErrors.rpc.methodNotSupported();
      }
    } catch (error) {
      // Convert error to RPC error if possible
      if (isViemError(error)) {
        const newError = viemHttpErrorToProviderError(error);
        if (newError) {
          throw newError;
        }
      }
      throw error;
    }
  };

  return { request };
}

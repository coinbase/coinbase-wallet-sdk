import { Signature } from 'ox';
import {
  Address,
  Hex,
  SignableMessage,
  TypedDataDefinition,
  hexToBytes,
  hexToNumber,
  hexToString,
  isHex,
  numberToHex,
} from 'viem';
import { getCode } from 'viem/actions';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { PrepareCallsParams, type PrepareCallsSchema } from ':core/rpc/wallet_prepareCalls.js';
import {
  SendPreparedCallsParams,
  type SendPreparedCallsSchema,
} from ':core/rpc/wallet_sendPreparedCalls.js';
import { getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { asn1EncodeSignature, convertCredentialToJSON } from ':util/encoding.js';
import { get } from ':util/get.js';
import { createSmartAccount } from './createSmartAccount.js';
import { getOwnerIndex } from './getOwnerIndex.js';

export async function createSubAccountSigner({ chainId }: { chainId: number }) {
  const client = getClient(chainId);
  assertPresence(client, standardErrors.rpc.internal(`client not found for chainId ${chainId}`));

  const subAccount = store.subAccounts.get();
  const toSubAccountSigner = store.getState().toSubAccountSigner;
  assertPresence(subAccount, standardErrors.rpc.internal('subaccount not found'));
  assertPresence(toSubAccountSigner, standardErrors.rpc.internal('toSubAccountSigner not defined'));

  const { account: owner } = await toSubAccountSigner();
  assertPresence(owner, standardErrors.rpc.internal('signer not found'));

  const code = await getCode(client, {
    address: subAccount.address,
  });

  // Default index to 1 if the contract is not deployed
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  let index = 1;
  if (code) {
    index = await getOwnerIndex({
      address: subAccount.address,
      publicKey: owner.address || owner.publicKey,
      client,
    });
  }

  // If contract is not deployed we need to have the factory data
  if (!code) {
    assertPresence(subAccount.factoryData, standardErrors.rpc.internal('factory data not found'));
  }

  const account = await createSmartAccount({
    owner,
    ownerIndex: index,
    address: subAccount.address,
    client,
    factoryData: subAccount.factoryData,
  });

  const request = async (args: RequestArguments) => {
    switch (args.method) {
      case 'wallet_addSubAccount':
        return subAccount!;
      case 'eth_accounts':
        return [subAccount!.address] as Address[];
      case 'eth_coinbase':
        return subAccount!.address;
      case 'net_version':
        return chainId.toString();
      case 'eth_chainId':
        return numberToHex(chainId);
      case 'eth_sendTransaction': {
        assertArrayPresence(args.params);
        return account.sign(args.params[0] as { hash: Hex });
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

        const walletClient = getClient(hexToNumber(chainId));
        assertPresence(
          walletClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        if (!args.params[0]) {
          throw standardErrors.rpc.invalidParams('params are required');
        }

        if (!('calls' in args.params[0])) {
          throw standardErrors.rpc.invalidParams('calls are required');
        }

        const prepareCallsResponse = (await request({
          method: 'wallet_prepareCalls',
          params: [
            {
              calls: args.params[0].calls as {
                to: Address;
                data: Hex;
                value: Hex;
              }[],
              chainId: chainId,
              from: subAccount.address,
              capabilities:
                'capabilities' in args.params[0]
                  ? (args.params[0].capabilities as Record<string, any>)
                  : {},
            },
          ],
        })) as PrepareCallsSchema['ReturnType'];

        const signature = await owner!.sign?.({
          // Hash returned from wallet_prepareCalls is double hex encoded
          hash: hexToString(prepareCallsResponse.signatureRequest.hash) as `0x${string}`,
        });

        let signatureData: SendPreparedCallsSchema['Parameters'][0]['signature'];

        if (!signature) {
          throw standardErrors.rpc.internal('signature not found');
        }

        if (isHex(signature)) {
          signatureData = {
            type: 'secp256k1',
            data: {
              address: owner!.address!,
              signature: signature as Hex,
            },
          };
        } else {
          const { webauthn, signature: signatureHex } = signature;

          const signatureRaw = Signature.fromHex(signatureHex);

          signatureData = {
            type: 'webauthn',
            data: {
              signature: JSON.stringify(
                convertCredentialToJSON({
                  id: owner!.id ?? '1',
                  rawId: owner!.id ?? '',
                  response: {
                    authenticatorData: hexToBytes(webauthn.authenticatorData),
                    clientDataJSON: webauthn.clientDataJSON,
                    signature: asn1EncodeSignature(signatureRaw.r, signatureRaw.s),
                  },
                  type: JSON.parse(webauthn.clientDataJSON).type,
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

        const walletClient = getClient(hexToNumber(chainId));
        assertPresence(
          walletClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        const sendPreparedCallsResponse = await walletClient.request<SendPreparedCallsSchema>({
          method: 'wallet_sendPreparedCalls',
          params: args.params as SendPreparedCallsParams,
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

        const walletClient = getClient(hexToNumber(chainId));
        assertPresence(
          walletClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        if (!args.params[0]) {
          throw standardErrors.rpc.invalidParams('params are required');
        }

        if (!get(args.params[0], 'calls')) {
          throw standardErrors.rpc.invalidParams('calls are required');
        }

        const prepareCallsResponse = await walletClient.request<PrepareCallsSchema>({
          method: 'wallet_prepareCalls',
          params: [{ ...args.params[0], chainId: chainId }] as PrepareCallsParams,
        });

        return prepareCallsResponse;
      }
      case 'personal_sign': {
        assertArrayPresence(args.params);
        return account.signMessage({ message: args.params[0] } as {
          message: SignableMessage;
        });
      }
      case 'eth_signTypedData_v4': {
        assertArrayPresence(args.params);
        return account.signTypedData(args.params[1] as TypedDataDefinition);
      }
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain':
      default:
        throw standardErrors.rpc.methodNotSupported();
    }
  };

  return {
    request,
    address: subAccount.address,
  };
}

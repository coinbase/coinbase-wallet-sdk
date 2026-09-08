import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { Address, OwnerAccount } from ':core/type/index.js';
import { getClient } from ':core/namespaces/eip155/client/index.js';
import { assertPresence } from ':util/assertPresence.js';
import { decodeAbiParameters, encodeFunctionData, numberToHex, toHex } from 'viem';
import { waitForCallsStatus } from 'viem/actions';
import { abi } from './constants.js';
import { findOwnerIndex } from './findOwnerIndex.js';
import { presentAddOwnerDialog } from './presentAddOwnerDialog.js';

export async function handleAddSubAccountOwner({
  ownerAccount,
  globalAccountRequest,
  chainId,
  globalAccount,
  subAccount,
  appName,
}: {
  ownerAccount: OwnerAccount;
  globalAccountRequest: (request: RequestArguments) => Promise<unknown>;
  chainId: number;
  globalAccount: Address;
  subAccount: Address;
  appName?: string;
}) {
  const calls = [];
  if (ownerAccount.type === 'local' && ownerAccount.address) {
    calls.push({
      to: subAccount,
      data: encodeFunctionData({
        abi,
        functionName: 'addOwnerAddress',
        args: [ownerAccount.address] as const,
      }),
      value: toHex(0),
    });
  }

  if (ownerAccount.publicKey) {
    const [x, y] = decodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      ownerAccount.publicKey
    );
    calls.push({
      to: subAccount,
      data: encodeFunctionData({
        abi,
        functionName: 'addOwnerPublicKey',
        args: [x, y] as const,
      }),
      value: toHex(0),
    });
  }

  const request: RequestArguments = {
    method: 'wallet_sendCalls',
    params: [
      {
        version: '1',
        calls,
        chainId: numberToHex(chainId),
        from: globalAccount,
      },
    ],
  };

  const selection = await presentAddOwnerDialog(appName);
  if (selection === 'cancel') {
    throw standardErrors.provider.unauthorized('user cancelled');
  }

  const callsId = (await globalAccountRequest(request)) as string;

  const client = getClient(chainId);
  assertPresence(client, standardErrors.rpc.internal(`client not found for chainId ${chainId}`));

  const callsResult = await waitForCallsStatus(client, {
    id: callsId,
  });

  if (callsResult.status !== 'success') {
    throw standardErrors.rpc.internal('add owner call failed');
  }

  const ownerIndex = await findOwnerIndex({
    address: subAccount,
    publicKey:
      ownerAccount.type === 'local' && ownerAccount.address
        ? ownerAccount.address
        : ownerAccount.publicKey,
    client,
  });

  if (ownerIndex === -1) {
    throw standardErrors.rpc.internal('failed to find owner index');
  }

  return ownerIndex;
}

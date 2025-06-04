import { standardErrors } from ":core/error/errors.js";
import { RequestArguments } from ":core/provider/interface.js";
import { OwnerAccount } from ":core/type/index.js";
import { getClient } from ":store/chain-clients/utils.js";
import { store } from ":store/store.js";
import { assertPresence } from ":util/assertPresence.js";
import {
  decodeAbiParameters,
  encodeFunctionData,
  numberToHex,
  toHex,
} from "viem";
import { waitForCallsStatus } from "viem/experimental";
import { abi } from "../utils/constants.js";
import { findOwnerIndex } from "../utils/findOwnerIndex.js";
import { presentAddOwnerDialog } from "./presentAddOwnerDialog.js";

export async function handleAddSubAccountOwner({
  ownerAccount,
  globalAccountRequest,
}: {
  ownerAccount: OwnerAccount;
  globalAccountRequest: (request: RequestArguments) => Promise<unknown>;
}) {
  const account = store.account.get();
  const subAccount = store.subAccounts.get();
  const globalAccount = account.accounts?.find(
    (account) => account.toLowerCase() !== subAccount?.address.toLowerCase()
  );

  assertPresence(
    globalAccount,
    standardErrors.provider.unauthorized("no global account")
  );
  assertPresence(
    account.chain?.id,
    standardErrors.provider.unauthorized("no chain id")
  );
  assertPresence(
    subAccount?.address,
    standardErrors.provider.unauthorized("no sub account")
  );

  const calls = [];
  if (ownerAccount.type === "local" && ownerAccount.address) {
    calls.push({
      to: subAccount.address,
      data: encodeFunctionData({
        abi,
        functionName: "addOwnerAddress",
        args: [ownerAccount.address] as const,
      }),
      value: toHex(0),
    });
  }

  if (ownerAccount.publicKey) {
    const [x, y] = decodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }],
      ownerAccount.publicKey
    );
    calls.push({
      to: subAccount.address,
      data: encodeFunctionData({
        abi,
        functionName: "addOwnerPublicKey",
        args: [x, y] as const,
      }),
      value: toHex(0),
    });
  }

  const request: RequestArguments = {
    method: "wallet_sendCalls",
    params: [
      {
        version: "1",
        calls,
        chainId: numberToHex(84532),
        from: globalAccount,
      },
    ],
  };

  const selection = await presentAddOwnerDialog();
  if (selection === "cancel") {
    throw standardErrors.provider.unauthorized("user cancelled");
  }

  const callsId = (await globalAccountRequest(request)) as string;

  const client = getClient(account.chain.id);
  assertPresence(
    client,
    standardErrors.rpc.internal(
      `client not found for chainId ${account.chain.id}`
    )
  );

  const callsResult = await waitForCallsStatus(client, {
    id: callsId,
  });

  if (callsResult.status === "success") {
    const ownerIndex = await findOwnerIndex({
      address: subAccount.address,
      publicKey:
        ownerAccount.type === "local" && ownerAccount.address
          ? ownerAccount.address
          : ownerAccount.publicKey,
      client,
    });
    if (ownerIndex !== -1) {
      return;
    }
  } else {
    throw standardErrors.rpc.internal("failed to add owner to sub account");
  }
}

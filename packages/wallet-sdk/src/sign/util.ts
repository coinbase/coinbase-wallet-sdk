import { ExtensionSigner } from './extension/ExtensionSigner';
import { Signer, SignerUpdateCallback } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WalletLinkSigner } from './walletlink/WalletLinkSigner';
import { Communicator } from ':core/communicator/Communicator';
import { ConfigMessage, MessageID, SignerType } from ':core/message';
import { AppMetadata, Preference } from ':core/provider/interface';
import type { BaseStorage } from ':util/BaseStorage';
import { ScopedStorage } from ':util/ScopedStorage';

const SIGNER_TYPE_KEY = 'SignerType';

export function loadSignerType(baseStorage: BaseStorage | undefined): SignerType | null {
  const storage = new ScopedStorage('CBWSDK', 'SignerConfigurator', baseStorage);
  return storage.getItem(SIGNER_TYPE_KEY) as SignerType;
}

export function storeSignerType(signerType: SignerType, baseStorage: BaseStorage | undefined) {
  const storage = new ScopedStorage('CBWSDK', 'SignerConfigurator', baseStorage);
  storage.setItem(SIGNER_TYPE_KEY, signerType);
}

export async function fetchSignerType(params: {
  communicator: Communicator;
  preference: Preference;
  metadata: AppMetadata; // for WalletLink
}): Promise<SignerType> {
  const { communicator, metadata } = params;
  listenForWalletLinkSessionRequest(communicator, metadata).catch(() => {});

  const request: ConfigMessage & { id: MessageID } = {
    id: crypto.randomUUID(),
    event: 'selectSignerType',
    data: params.preference,
  };
  const { data } = await communicator.postRequestAndWaitForResponse(request);
  return data as SignerType;
}

export function createSigner(params: {
  signerType: SignerType;
  metadata: AppMetadata;
  communicator: Communicator;
  callback: SignerUpdateCallback;
}): Signer {
  const { signerType, metadata, communicator, callback } = params;
  switch (signerType) {
    case 'scw':
      return new SCWSigner({
        metadata,
        callback,
        communicator,
      });
    case 'walletlink':
      return new WalletLinkSigner({
        metadata,
        callback,
      });
    case 'extension': {
      return new ExtensionSigner({
        metadata,
        callback,
      });
    }
  }
}

async function listenForWalletLinkSessionRequest(
  communicator: Communicator,
  metadata: AppMetadata
) {
  await communicator.onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest');

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  const walletlink = new WalletLinkSigner({
    metadata,
  });

  // send wallet link session to popup
  communicator.postMessage({
    event: 'WalletLinkUpdate',
    data: { session: walletlink.getSession() },
  } as ConfigMessage);

  // wait for handshake to complete
  await walletlink.handshake();

  // send connected status to popup
  communicator.postMessage({
    event: 'WalletLinkUpdate',
    data: { connected: true },
  } as ConfigMessage);
}

import { Signer } from './interface.js';
import { SCWSigner } from './scw/SCWSigner.js';
import { WalletLinkSigner } from './walletlink/WalletLinkSigner.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { ConfigMessage, SignerType } from ':core/message/ConfigMessage.js';
import { MessageID } from ':core/message/Message.js';
import {
  AppMetadata,
  Preference,
  ProviderEventCallback,
  RequestArguments,
} from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';

const SIGNER_TYPE_KEY = 'SignerType';
const storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

export function loadSignerType(): SignerType | null {
  return storage.getItem(SIGNER_TYPE_KEY) as SignerType;
}

export function storeSignerType(signerType: SignerType) {
  storage.setItem(SIGNER_TYPE_KEY, signerType);
}

export async function fetchSignerType(params: {
  communicator: Communicator;
  preference: Preference;
  metadata: AppMetadata; // for WalletLink
  handshakeRequest: RequestArguments;
  callback: ProviderEventCallback;
}): Promise<SignerType> {
  const { communicator, metadata, handshakeRequest, callback } = params;
  listenForWalletLinkSessionRequest(communicator, metadata, callback).catch(() => {});

  const request: ConfigMessage & { id: MessageID } = {
    id: crypto.randomUUID(),
    event: 'selectSignerType',
    data: {
      ...params.preference,
      handshakeRequest,
    },
  };
  const { data } = await communicator.postRequestAndWaitForResponse(request);
  return data as SignerType;
}

export function createSigner(params: {
  signerType: SignerType;
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback;
}): Signer {
  const { signerType, metadata, communicator, callback } = params;
  switch (signerType) {
    case 'scw': {
      return new SCWSigner({
        metadata,
        callback,
        communicator,
      });
    }
    case 'walletlink': {
      return new WalletLinkSigner({
        metadata,
        callback,
      });
    }
  }
}

async function listenForWalletLinkSessionRequest(
  communicator: Communicator,
  metadata: AppMetadata,
  callback: ProviderEventCallback
) {
  await communicator.onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest');

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  const walletlink = new WalletLinkSigner({
    metadata,
    callback,
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

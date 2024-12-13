import { Signer } from './interface.js';
import { SCWSigner } from './scw/SCWSigner.js';
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
  const { communicator, handshakeRequest } = params;
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
  }
}

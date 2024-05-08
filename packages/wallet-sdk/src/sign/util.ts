import { WalletLinkSigner } from './walletlink/WalletLinkSigner';
import { Communicator } from ':core/communicator/Communicator';
import { ConfigMessage, SignerType } from ':core/message';
import { AppMetadata, Preference } from ':core/provider/interface';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

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
}): Promise<SignerType> {
  const { communicator, metadata } = params;
  listenForWalletLinkSessionRequest(communicator, metadata);

  const request: ConfigMessage = {
    id: crypto.randomUUID(),
    event: 'selectSignerType',
    data: params.preference,
  };
  const { data } = await communicator.postRequestAndWaitForResponse(request);
  return data as SignerType;
}

async function listenForWalletLinkSessionRequest(
  communicator: Communicator,
  metadata: AppMetadata
) {
  await communicator
    .onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest')
    .catch(() => {});

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

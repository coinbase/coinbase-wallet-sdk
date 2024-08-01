import { Signer } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { Communicator } from ':core/communicator/Communicator';
import { SignerType } from ':core/message';
import { AppMetadata, Preference, ProviderEventCallback } from ':core/provider/interface';
import { ScopedAsyncStorage } from ':core/storage/ScopedAsyncStorage';

const SIGNER_TYPE_KEY = 'SignerType';
const storage = new ScopedAsyncStorage('CBWSDK', 'SignerConfigurator');

export async function loadSignerType(): Promise<SignerType | null> {
  return (await storage.getItem(SIGNER_TYPE_KEY)) as SignerType;
}

export async function storeSignerType(signerType: SignerType): Promise<void> {
  return storage.setItem(SIGNER_TYPE_KEY, signerType);
}

export async function fetchSignerType(_params: {
  communicator: Communicator;
  preference: Preference;
  metadata: AppMetadata;
}): Promise<SignerType> {
  // As of today, mobile SDK only supports SCW
  return 'scw' as SignerType;
}

export async function createSigner(params: {
  signerType: SignerType;
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback;
}): Promise<Signer> {
  const { signerType, metadata, communicator, callback } = params;
  switch (signerType) {
    case 'scw': {
      return SCWSigner.createInstance({
        metadata,
        callback,
        communicator,
      });
    }
    default: {
      throw new Error(`Unsupported signer type: ${signerType}`);
    }
  }
}

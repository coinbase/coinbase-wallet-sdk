import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { LIB_VERSION } from '../../version';
import { Connector } from '../ConnectorInterface';
import { exportKeyToHexString, importKeyFromHexString } from './protocol/key/Cipher';
import { KeyStorage } from './protocol/key/KeyStorage';
import {
  decryptContent,
  encryptContent,
  SCWRequestMessage,
  SCWResponseMessage,
} from './protocol/SCWMessage';
import { Action, SupportedEthereumMethods } from './protocol/type/Action';
import { SCWResponse } from './protocol/type/Response';

export class SCWConnector implements Connector {
  private appName: string;
  private appLogoUrl: string | null;
  // TODO: handle chainId
  private activeChainId = 1;

  private puc: PopUpCommunicator;
  private keyStorage: KeyStorage;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    puc: PopUpCommunicator;
    keyStorage: KeyStorage;
  }) {
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.puc = options.puc;
    this.keyStorage = options.keyStorage;
  }

  public async handshake(): Promise<AddressString[]> {
    // TODO
    await this.puc.connect();

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: SupportedEthereumMethods.EthRequestAccounts,
        params: {
          dappName: this.appName,
          dappLogoUrl: this.appLogoUrl,
        },
      },
    });

    const response = (await this.puc.request(handshakeMessage)) as SCWResponseMessage;

    // throw protocol level error
    if ('error' in response.content) {
      throw response.content.error;
    }

    // take the peer's public key and store it
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyStorage.setPeerPublicKey(peerPublicKey);

    return this.decodeResponseMessage<AddressString[]>(response);
  }

  public async request<T>(request: RequestArguments): Promise<T> {
    // TODO: this check makes sense, but connected isn't set properly so it prevents
    // need to investigate
    // if (!this.puc.connected) {
    await this.puc.connect();
    // }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      // TODO: better error
      throw new Error('Invalid session');
    }

    const encrypted = await encryptContent(
      {
        action: request as Action,
        chainId: this.activeChainId,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    return this.puc
      .request(message)
      .then((response) => response as SCWResponseMessage)
      .then(this.decodeResponseMessage<T>);
  }

  private async createRequestMessage(
    content: SCWRequestMessage['content']
  ): Promise<SCWRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyStorage.getOwnPublicKey());
    return {
      type: 'scw',
      id: crypto.randomUUID(),
      sender: publicKey,
      content,
      version: LIB_VERSION,
      timestamp: new Date(),
    };
  }

  private async decodeResponseMessage<T>(message: SCWResponseMessage): Promise<T> {
    const content = message.content;

    // throw protocol level error
    if ('error' in content) {
      throw content.error;
    }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      // TODO: better error
      throw new Error('Invalid session');
    }

    const decrypted: SCWResponse<T> = await decryptContent(content.encrypted, sharedSecret);
    const result = decrypted.result;

    // check for ActionResult error
    if ('error' in result) {
      throw result.error;
    }

    return result.value;
  }
}

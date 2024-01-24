import EventEmitter from 'eventemitter3';

import { PopUpCommunicator } from '../connector/scw/client/PopUpCommunicator';
import { SCWConnector } from '../connector/scw/client/SCWConnector';
import { Connector } from '../connector/scw/type/ConnectorInterface';
import { standardErrors } from '../core/error';
import { prepend0x } from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { CoinbaseWalletProviderOptions } from './CoinbaseWalletProvider';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

export interface EIP1193ProviderOptions
  extends Omit<CoinbaseWalletProviderOptions, 'relayProvider'> {
  reloadOnDisconnect?: boolean;
  enableMobileWalletLink?: boolean;
  linkAPIUrl?: string;
  popupCommunicator: PopUpCommunicator;
  appName?: string;
  appLogoUrl?: string | null;
}
interface DisconnectInfo {
  error: ProviderRpcError;
}

export class EIP1193Provider extends EventEmitter implements ProviderInterface {
  // private oldProvider!: CoinbaseWalletProvider;
  private storage: ScopedLocalStorage;
  private popupCommunicator: PopUpCommunicator;

  connected: boolean;
  private accounts: string[] | undefined;
  private appName = '';
  private appLogoUrl: string | null = null;
  // private options: Readonly<EIP1193ProviderOptions>;
  private connector: Connector | undefined;
  private connectionType: string | null;
  private chainId: number;

  constructor(options: Readonly<EIP1193ProviderOptions>) {
    super();

    this.storage = options.storage;
    this.popupCommunicator = options.popupCommunicator;
    this.appName = options.appName ?? '';
    this.appLogoUrl = options.appLogoUrl ?? null;
    this.chainId = options.chainId;
    this.connected = false;
    const persistedConnectionType = this.storage.getItem('connectionType');
    this.connectionType = persistedConnectionType;
    if (persistedConnectionType === 'scw') {
      this.initScwConnector();
    }
  }

  private initScwConnector = () => {
    this.connector = new SCWConnector({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      puc: this.popupCommunicator,
    });
    this.emitConnectEvent();
  };

  private emitConnectEvent() {
    this.connected = true;
    const chainIdStr = prepend0x(this.chainId.toString(16));
    // https://eips.ethereum.org/EIPS/eip-1193#connect
    this.emit('connect', { chainId: chainIdStr });
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method == 'eth_requestAccounts') {
      if (this.accounts) {
        return Promise.resolve(this.accounts);
      }
      if (!this.connectionType) {
        // begin select connection type scw/walletlink/extension
        await this.popupCommunicator.connect();
        const selectRelayTypeResponse = await this.popupCommunicator.selectRelayType();
        this.connectionType = selectRelayTypeResponse?.relay;
        this.storage.setItem('connectionType', this.connectionType);
        // end select connection type scw/walletlink/extension
      }
      if (this.connectionType === 'scw') {
        this.initScwConnector();
        const ethAddresses = (await this.connector?.handshake())?.result;
        this.accounts = ethAddresses;
        return Promise.resolve(this.accounts);
      } else if (this.connectionType === 'walletlink') {
        // TODO: walletlink
        return Promise.reject(new Error('walletlink not supported yet'));
        // TODO: handle user goback/cancel
      } else if (this.connectionType === 'extension') {
        // TODO: persist selection and use it for future requests
        const extension = window.coinbaseWalletExtension;
        if (!extension) {
          throw new Error('Coinbase Wallet Extension not found');
        }
        const response = await extension.request({ method: 'eth_requestAccounts' });
        if (Array.isArray(response)) {
          this.accounts = response;
        }
        return Promise.resolve(this.accounts);
      }
    }

    if (this.connectionType === 'scw' && this.connector) {
      const res = (await this.connector.request(args)).result;
      return Promise.resolve(res);
    }

    // if type unhandled reject for now
    return Promise.reject(`connectionType ${this.connectionType} not supported yet`);
  }

  // disconnect is not required, and not called by test app
  disconnect(): void {
    const disconnectInfo: DisconnectInfo = {
      error: standardErrors.provider.disconnected('User initiated disconnection'),
    };
    this.storage.removeItem('relayType');
    this.connected = false;
    this.emit('disconnect', disconnectInfo);
  }

  // *
  //  deprecated methods - more methods will likely be added here later
  // *
  public async enable(): Promise<unknown> {
    this.showDeprecationWarning('enable', 'request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  private showDeprecationWarning(oldMethod: string, newMethod: string): void {
    console.warn(`EIP1193Provider: ${oldMethod} is deprecated. Please use ${newMethod} instead.`);
  }
}

import EventEmitter from 'eventemitter3';

import { CoinbaseWalletSDK } from '../CoinbaseWalletSDK';
import { LINK_API_URL } from '../core/constants';
import { standardErrors } from '../core/error';
import { RegExpString } from '../core/type';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { RelayEventManager } from '../relay/RelayEventManager';
import { RelayUIOptions } from '../relay/RelayUI';
import { PopUpCommunicator } from '../relay/scw/client/PopUpCommunicator';
import { SCWRelay } from '../relay/scw/client/SCWRelay';
import { isErrorResponse } from '../relay/walletlink/type/Web3Response';
import { WalletLinkRelayUI } from '../relay/walletlink/ui/WalletLinkRelayUI';
import { WalletLinkRelay } from '../relay/walletlink/WalletLinkRelay';
import { CoinbaseWalletProvider, CoinbaseWalletProviderOptions } from './CoinbaseWalletProvider';
import { DiagnosticLogger } from './DiagnosticLogger';
import {
  EIP1193Provider as EIP1193ProviderInterface,
  ProviderRpcError,
  RequestArguments,
} from './ProviderInterface';

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

type RelayType = 'scw' | 'walletLink';

export class EIP1193Provider extends EventEmitter implements EIP1193ProviderInterface {
  private oldProvider!: CoinbaseWalletProvider;
  private storage: ScopedLocalStorage;
  private relayEventManager: RelayEventManager;
  private diagnosticLogger?: DiagnosticLogger;
  private reloadOnDisconnect: boolean;
  private enableMobileWalletLink?: boolean;
  private popupCommunicator: PopUpCommunicator;
  private linkAPIUrl: string;

  connected: boolean;
  private walletLinkRelay: WalletLinkRelay | undefined;
  private accounts: string[] | undefined;
  private relay: SCWRelay | undefined;
  private appName = '';
  private appLogoUrl: string | null = null;

  constructor(options: Readonly<EIP1193ProviderOptions>) {
    super();

    this.storage = options.storage;
    this.linkAPIUrl = options.linkAPIUrl || LINK_API_URL;
    this.relayEventManager = options.relayEventManager;
    this.diagnosticLogger = options.diagnosticLogger;
    this.reloadOnDisconnect = options.reloadOnDisconnect ?? true;
    this.enableMobileWalletLink = options.enableMobileWalletLink;
    this.popupCommunicator = options.popupCommunicator;
    this.appName = options.appName ?? '';
    this.appLogoUrl = options.appLogoUrl ?? null;

    // For now we are not emitting a 'connect' event since the old provider already emits one
    // when we init old provider after relayType is selected
    this.connected = true;
  }

  initOldProviderWithUserRelaySelection(relayType: RelayType) {
    this.storage.setItem('relayType', relayType);
    if (relayType === 'scw') {
      this.relay = new SCWRelay();
      this.relay.setAppInfo(this.appName, this.appLogoUrl);
    }

    // this.oldProvider = new CoinbaseWalletProvider({
    //   relayProvider: () => Promise.resolve(this.relay),
    //   ...this.options,
    // });
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method == 'eth_requestAccounts' && !this.oldProvider) {
      await this.popupCommunicator.connect();

      const selectRelayTypeResponse = await this.popupCommunicator.selectRelayType();

      if (selectRelayTypeResponse?.relay === 'scw') {
        this.initOldProviderWithUserRelaySelection('scw');
        const ethAccountsResponse = await this.relay?.requestEthereumAccounts().promise;
        if (isErrorResponse(ethAccountsResponse)) {
          return;
        }
        if (ethAccountsResponse?.result) {
          this.accounts = ethAccountsResponse?.result;
        }
        return Promise.resolve(this.accounts);
      } else if (selectRelayTypeResponse?.relay === 'walletlink') {
        return new Promise((resolve) => {
          const wlRelay = this.initializeWalletLinkRelay();
          wlRelay.setAccountsCallback((accounts) => {
            this.accounts = accounts;
            resolve(accounts);
          });
          const walletLinkQRCodeUrl = wlRelay.getQRCodeUrl();
          this.relay?.scanQRCode(walletLinkQRCodeUrl as RegExpString);
        });

        // TODO: handle user goback/cancel
      }
    }

    // something went wrong during relay selection, reject
    if (!this.oldProvider) {
      const error = standardErrors.provider.disconnected();
      this.popupCommunicator.disconnect();
      return Promise.reject(error);
    }

    return this.oldProvider.request(args);
  }

  private initializeWalletLinkRelay(): WalletLinkRelay {
    if (this.walletLinkRelay) return this.walletLinkRelay;

    const uiConstructor = (opts: Readonly<RelayUIOptions>) => new WalletLinkRelayUI(opts);
    const linkAPIUrl = this.linkAPIUrl || LINK_API_URL;
    const walletLinkRelayOptions = {
      linkAPIUrl,
      version: CoinbaseWalletSDK.VERSION,
      darkMode: false,
      uiConstructor,
      storage: this.storage,
      relayEventManager: this.relayEventManager,
      diagnosticLogger: this.diagnosticLogger,
      reloadOnDisconnect: this.reloadOnDisconnect,
      enableMobileWalletLink: this.enableMobileWalletLink,
    };

    this.walletLinkRelay = new WalletLinkRelay(walletLinkRelayOptions);
    return this.walletLinkRelay;
  }

  // disconnect is not required, and not called by test app
  disconnect(): void {
    if (this.connected) {
      const disconnectInfo: DisconnectInfo = {
        error: standardErrors.provider.disconnected('User initiated disconnection'),
      };
      this.storage.removeItem('relayType');
      this.connected = false;
      this.emit('disconnect', disconnectInfo);
    }
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

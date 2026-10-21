import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import { createClients } from ':core/namespaces/eip155/client/index.js';
import { createActiveChain } from ':core/namespaces/eip155/eip1193/activeChain.js';
import {
  type Eip1193Context,
  handleEip1193Request,
  projectEip155ChainMetadata,
  projectEthAccounts,
} from ':core/namespaces/eip155/index.js';
import {
  ProviderEventEmitter,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface.js';
import type { Session } from ':core/session/types.js';
import { logSessionCleared } from ':core/telemetry/events/session.js';
import type { WalletTransport } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import type { Store } from ':store/store.js';
import { checkErrorForInvalidRequestArgs } from ':util/provider.js';
import { measureRequest } from '../measureRequest.js';

type CoinbaseWalletProviderParams = {
  transport: WalletTransport;
  store: Store;
};

/** EIP-1193 shell. Validates args, then `handleEip1193Request` (createSession / invoke). */
export class CoinbaseWalletProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly context: Eip1193Context;
  /** What the application has been told: the last connection state it saw an event for. */
  private connected: boolean;

  public readonly request: ProviderInterface['request'];

  constructor({ transport, store }: CoinbaseWalletProviderParams) {
    super();
    this.request = async (args) =>
      measureRequest({ surface: 'eip1193_provider', method: args.method, transport }, (measured) =>
        this.handleRequest(args, measured)
      );

    const restoredSession = transport.readSession();
    this.connected = !!restoredSession && projectEthAccounts(restoredSession).length > 0;
    if (restoredSession) createClients(projectEip155ChainMetadata(restoredSession));

    const activeChain = createActiveChain({
      store: store.activeChain,
      onChange: (chainId) => this.emit('chainChanged', hexStringFromNumber(chainId)),
    });
    this.context = {
      transport,
      emit: this.emit.bind(this),
      chain: activeChain,
    };

    store.session.subscribe(this.handleSessionChange);
  }

  /**
   * Reflect EVM authorization removed outside `disconnect()` into EIP-1193 events: by another
   * interface, or by core clearing the session on a 4100.
   */
  private handleSessionChange = (session: Session | undefined): void => {
    if (session) createClients(projectEip155ChainMetadata(session));

    const connected = !!session && projectEthAccounts(session).length > 0;

    const revokedElsewhere = this.connected && !connected;
    this.connected = connected;
    if (!revokedElsewhere) return;

    this.emit('accountsChanged', []);
    this.emit(
      'disconnect',
      standardErrors.provider.disconnected('Shared wallet session disconnected')
    );
  };

  private handleRequest = async (
    args: RequestArguments,
    measured: WalletTransport
  ): Promise<unknown> => {
    try {
      checkErrorForInvalidRequestArgs(args);
      return await handleEip1193Request({ ...this.context, transport: measured }, args);
    } catch (error) {
      return Promise.reject(serializeError(error));
    }
  };

  async disconnect() {
    this.connected = false;
    const saved = this.context.transport.readSession();
    await this.context.transport.cleanup();
    if (saved) logSessionCleared({ clearReason: 'user_disconnect' });
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;
}

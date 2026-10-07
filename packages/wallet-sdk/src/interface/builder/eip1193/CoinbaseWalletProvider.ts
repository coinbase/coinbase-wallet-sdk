import { standardErrorCodes } from ':core/error/constants.js';
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
import type { WalletTransport } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import type { Store } from ':store/store.js';
import { checkErrorForInvalidRequestArgs } from ':util/provider.js';
import { assertEphemeralMethod } from './ephemeral.js';
import { withMeasurement } from './withMeasurement.js';

type CoinbaseWalletProviderParams = {
  transport: WalletTransport;
  store: Store;
  /**
   * Restricts requests to the one-shot methods used by `pay()`.
   * The caller owns the corresponding isolated transport.
   */
  ephemeral?: boolean;
};

/** EIP-1193 shell. Validates args, then `handleEip1193Request` (createSession / invoke). */
export class CoinbaseWalletProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly context: Eip1193Context;
  private readonly ephemeral: boolean;
  /** What the application has been told: the last connection state it saw an event for. */
  private connected: boolean;

  public readonly request: ProviderInterface['request'];

  constructor({ transport, store, ephemeral = false }: CoinbaseWalletProviderParams) {
    super();
    this.ephemeral = ephemeral;
    this.request = withMeasurement({ isEphemeral: ephemeral }, this.handleRequest);

    const restoredSession = transport.readSession();
    this.connected = !!restoredSession && projectEthAccounts(restoredSession).length > 0;
    if (restoredSession) createClients(projectEip155ChainMetadata(restoredSession));

    // Every provider starts on Ethereum mainnet and moves only when something asks it to.
    // The wallet serves mainnet, so there is no catalog to reconcile against here.
    const activeChain = createActiveChain({
      onChange: (chainId) => this.emit('chainChanged', hexStringFromNumber(chainId)),
    });
    this.context = {
      transport,
      emit: this.emit.bind(this),
      chain: activeChain,
    };

    store.session.subscribe(this.handleSessionChange);
  }

  /** Reflect EVM authorization removed by another interface into EIP-1193 events. */
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

  private handleRequest = async <T>(args: RequestArguments): Promise<T> => {
    try {
      checkErrorForInvalidRequestArgs(args);
      if (this.ephemeral) assertEphemeralMethod(args.method);
      return (await handleEip1193Request(this.context, args)) as T;
    } catch (error) {
      const { code } = error as { code?: number };
      if (code === standardErrorCodes.provider.unauthorized) {
        await this.disconnect();
      }
      return Promise.reject(serializeError(error));
    }
  };

  async disconnect() {
    this.connected = false;
    await this.context.transport.cleanup();
    correlationIds.clear();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;
}

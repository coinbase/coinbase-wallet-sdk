import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import {
  handleEip1193Request,
  projectEip155ChainMetadata,
  projectEthAccounts,
  type Eip1193Context,
} from ':core/namespaces/eip155/index.js';
import { createClients } from ':core/namespaces/eip155/client/index.js';
import {
  ConstructorOptions,
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
import { createActiveChain } from ':core/namespaces/eip155/eip1193/activeChain.js';

export type BaseAccountProviderParams = Readonly<ConstructorOptions> & {
  /**
   * Restricts requests to the one-shot methods used by `pay()`.
   * The caller owns the corresponding isolated transport.
   */
  ephemeral?: boolean;
};

/** EIP-1193 shell. Validates args, then `handleEip1193Request` (createSession / invoke). */
export class BaseAccountProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly context: Eip1193Context;
  private readonly ephemeral: boolean;
  private isDisconnecting = false;
  public readonly request: ProviderInterface['request'];

  constructor(params: BaseAccountProviderParams, transport: WalletTransport, store: Store) {
    super();
    const { ephemeral = false, metadata } = params;
    const restored = transport.readSession();
    const chain = createActiveChain({
      // Active chain only: a session authorizes the eip155 namespace, not one chain.
      defaultChainId: metadata.defaultChainId ?? metadata.appChainIds?.[0] ?? 1,
      session: restored,
      onChange: (chainId) => this.emit('chainChanged', hexStringFromNumber(chainId)),
    });
    this.ephemeral = ephemeral;
    this.context = {
      transport,
      cache: store.eip155,
      config: store.config,
      emit: this.emit.bind(this),
      chain,
    };
    this.syncSession(restored, false);
    store.session.subscribe(this.handleSessionChange);

    this.request = withMeasurement({ isEphemeral: ephemeral }, this.handleRequest);
  }

  /** Reflect EVM authorization removed by another interface into EIP-1193 events. */
  private handleSessionChange = (
    session: Session | undefined,
    previousSession: Session | undefined
  ): void => {
    const hadEip155Session = !!previousSession && projectEthAccounts(previousSession).length > 0;
    const hasEip155Session = !!session && projectEthAccounts(session).length > 0;
    this.syncSession(session);
    if (!hadEip155Session || hasEip155Session || this.isDisconnecting) return;

    this.emit('accountsChanged', []);
    this.emit(
      'disconnect',
      standardErrors.provider.disconnected('Shared wallet session disconnected')
    );
  };

  private syncSession(session: Session | undefined, emitChainChange = true): void {
    if (session && projectEthAccounts(session).length > 0) {
      createClients(projectEip155ChainMetadata(session));
      if (emitChainChange) this.context.chain.reconcile(session);
      return;
    }
    this.context.cache.spendPermissions.clear();
  }

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
    this.isDisconnecting = true;
    try {
      await this.context.transport.cleanup();
      correlationIds.clear();
    } finally {
      this.isDisconnecting = false;
    }
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isBaseAccount = true;
}

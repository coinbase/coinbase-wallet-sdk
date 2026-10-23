import type { RequestArguments } from ':core/message/RequestArguments.js';
import type { Session } from '../../storage/schema.js';

/**
 * Chain-neutral wallet transport and session lifecycle shared by public interfaces.
 */
export type WalletTransport = {
  /**
   * `correlationId` is the dapp request's, for the wallet's logs. It is an argument because core
   * builds every message itself, so no message is the dapp's own object to look the id up by.
   */
  handshake: (args?: RequestArguments, correlationId?: string) => Promise<void>;
  request: (request: RequestArguments, correlationId?: string) => Promise<unknown>;
  readSession: () => Session | undefined;
  writeSession: (session: Session) => void;
  cleanup: () => Promise<void>;
};

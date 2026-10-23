import type { RequestArguments } from ':core/message/RequestArguments.js';
import type { Session } from '../../storage/schema.js';

/**
 * Chain-neutral wallet transport and session lifecycle shared by public interfaces.
 */
export type WalletTransport = {
  /** `correlationId` belongs to the dapp request that caused the message, for the wallet's logs. */
  handshake: (args?: RequestArguments, correlationId?: string) => Promise<void>;
  request: (request: RequestArguments, correlationId?: string) => Promise<unknown>;
  readSession: () => Session | undefined;
  writeSession: (session: Session) => void;
  cleanup: () => Promise<void>;
};

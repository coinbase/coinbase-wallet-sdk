import type { RequestArguments } from ':core/message/RequestArguments.js';
import type { Session } from '../../storage/schema.js';

/**
 * Chain-neutral wallet transport and session lifecycle shared by public interfaces.
 */
export type WalletTransport = {
  handshake: (args?: RequestArguments) => Promise<void>;
  request: (request: RequestArguments) => Promise<unknown>;
  readSession: () => Session | undefined;
  writeSession: (session: Session) => void;
  cleanup: () => Promise<void>;
};

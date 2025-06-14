import { RequestArguments } from ':core/provider/interface.js';
import { UUID } from 'crypto';

export interface Signer {
  handshake(_: RequestArguments, requestId: UUID): Promise<void>;
  request<T>(_: RequestArguments, requestId: UUID): Promise<T>;
  cleanup: () => Promise<void>;
}

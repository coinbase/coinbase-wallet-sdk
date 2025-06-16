import { RequestArguments } from ':core/provider/interface.js';

export interface Signer {
  handshake(_: RequestArguments, requestId: string): Promise<void>;
  request<T>(_: RequestArguments, requestId: string): Promise<T>;
  cleanup: () => Promise<void>;
}

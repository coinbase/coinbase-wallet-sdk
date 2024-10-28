import { RequestArguments } from ':core/provider/interface.js';

export interface Signer {
  handshake(_: RequestArguments): Promise<void>;
  request<T>(_: RequestArguments): Promise<T>;
  cleanup: () => Promise<void>;
}

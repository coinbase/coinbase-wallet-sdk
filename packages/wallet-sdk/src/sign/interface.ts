import { RequestArguments } from ':core/provider/interface';

export interface Signer {
  handshake(_: RequestArguments): Promise<void>;
  request(_: RequestArguments): Promise<unknown>;
  cleanup: () => Promise<void>;
}

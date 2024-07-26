import { RequestArguments } from ':core/provider/interface';

export interface Signer {
  handshake(): Promise<void>;
  request(request: RequestArguments): Promise<unknown>;
  disconnect: () => Promise<void>;
}

import { Message } from './Message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  protected _connected = false;

  public get connected() {
    return this._connected;
  }

  protected set connected(value: boolean) {
    this._connected = value;
  }

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onEvent(event: MessageEvent<Message>): void;

  async connect(): Promise<void> {
    window.addEventListener('message', this.onEvent.bind(this));
    await this.onConnect();
  }

  disconnect(): void {
    this.connected = false;
    this.onDisconnect();
  }

  protected peerWindow: Window | null = null;

  postMessage(message: Message, options?: { bypassTargetOriginCheck: boolean }) {
    let targetOrigin = this.url?.origin;
    if (targetOrigin === undefined) {
      if (options?.bypassTargetOriginCheck) {
        targetOrigin = '*';
      } else {
        throw standardErrors.rpc.internal('Communicator: No target origin');
      }
    }

    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }

    this.peerWindow.postMessage(message, targetOrigin);
  }
}

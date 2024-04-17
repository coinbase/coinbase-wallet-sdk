import { Message } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  private connected = false;

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onEvent(event: MessageEvent<Message>): void;

  async connect(): Promise<void> {
    if (this.connected) return;
    window.addEventListener('message', this.onEvent.bind(this));
    await this.onConnect();
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    window.removeEventListener('message', this.onEvent.bind(this));
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

import { Message } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  private connected = false;

  protected abstract setupPeerWindow(): Promise<void>;
  protected abstract handleIncomingEvent(_: MessageEvent<Message>): void;

  protected async connect(): Promise<void> {
    if (this.connected) return;
    window.addEventListener('message', this.eventListener.bind(this));
    await this.setupPeerWindow();
    this.connected = true;
  }

  protected disconnect(): void {
    this.connected = false;
    window.removeEventListener('message', this.eventListener.bind(this));
  }

  protected peerWindow: Window | null = null;

  private getTargetOrigin(options?: { bypassTargetOriginCheck: boolean }): string | undefined {
    if (this.url) return this.url.origin;
    if (options?.bypassTargetOriginCheck) return '*';
    return undefined;
  }

  async postMessage(message: Message, options?: { bypassTargetOriginCheck: boolean }) {
    await this.connect();
    const targetOrigin = this.getTargetOrigin(options);
    if (!targetOrigin || !this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }
    this.peerWindow.postMessage(message, targetOrigin);
  }

  private eventListener(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;
    this.handleIncomingEvent(event);
  }
}

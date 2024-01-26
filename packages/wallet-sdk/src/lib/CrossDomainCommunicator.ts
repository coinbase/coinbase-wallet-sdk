import { UUID } from 'crypto';

export interface Message {
  id: UUID;
}

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  protected _connected = false;

  public get connected() {
    return this._connected;
  }

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onMessage(event: MessageEvent): void;

  async connect(): Promise<void> {
    window.addEventListener('message', this.eventListener.bind(this));
    await this.onConnect();
  }

  disconnect(): void {
    this._connected = false;
    this.onDisconnect();
  }

  protected eventListener(event: MessageEvent) {
    this.onMessage(event);
  }

  protected peerWindow: Window | null = null;
  protected postMessage(message: Message) {
    this.peerWindow?.postMessage(message, this.url?.origin ?? '*');
  }
}

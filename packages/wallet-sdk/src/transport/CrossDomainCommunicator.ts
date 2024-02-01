import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'scw';
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
  protected abstract onEvent(event: MessageEvent<Message>): void;

  async connect(): Promise<void> {
    window.addEventListener('message', this.onEvent.bind(this));
    await this.onConnect();
  }

  disconnect(): void {
    this._connected = false;
    this.onDisconnect();
  }

  protected peerWindow: Window | null = null;
  protected postMessage(message: Message) {
    this.peerWindow?.postMessage(message, this.url?.origin ?? '*');
  }
}

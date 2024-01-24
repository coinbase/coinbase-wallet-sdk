import { UUID } from 'crypto';

export interface Message {
  id: UUID;
}

export abstract class CrossDomainCommunicator {
  protected url: URL;
  protected connected = false;

  constructor({ url }: { url: string }) {
    this.url = new URL(url);
  }

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onMessage(event: Message): void;

  async connect(): Promise<void> {
    await this.onConnect();
    window.addEventListener('message', this.eventListener.bind(this));
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.onDisconnect();
  }

  private eventListener(event: MessageEvent) {
    if (event.origin !== this.url.origin) return;
    if (!this.connected) return;
    this.onMessage(event.data);
  }

  protected peerWindow: Window | null = null;
  protected postMessage(message: Message) {
    this.peerWindow?.postMessage(message, this.url.origin);
  }
}

import { Message, MessageID } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | null = null;
  protected peerWindow: Window | null = null;

  protected abstract setupPeerWindow(): Promise<void>;
  // returns true if the message is handled
  protected abstract handleIncomingMessage(_: Message): Promise<boolean>;

  protected disconnect() {
    window.removeEventListener('message', this.eventListener.bind(this));
    this.rejectWaitingRequests();
  }

  postMessage(_: Message, mode: 'sendOnly'): void;
  postMessage<T>(_: Message, mode: 'forResponse'): Promise<T>;
  async postMessage<T extends Message>(
    message: Message,
    mode: 'sendOnly' | 'forResponse'
  ): Promise<Promise<T> | void> {
    if (!this.peerWindow) {
      window.addEventListener('message', this.eventListener.bind(this));
      await this.setupPeerWindow();
    }

    const targetOrigin = this.url ? this.url.origin : '*';
    this.peerWindow!.postMessage(message, targetOrigin);
    if (mode === 'sendOnly') return;

    return new Promise((resolve, reject) => {
      this.requestMap.set(message.id, {
        resolve: (response) => resolve(response as T),
        reject,
      });
    });
  }

  private requestMap = new Map<
    MessageID,
    {
      resolve: (_: Message) => void;
      reject: (_: Error) => void;
    }
  >();

  private eventListener(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    const { requestId } = message;
    if (!requestId) {
      this.handleIncomingMessage(message);
      return;
    }

    this.requestMap.get(requestId)?.resolve?.(message);
    this.requestMap.delete(requestId);
  }

  private rejectWaitingRequests() {
    this.requestMap.forEach(({ reject }) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
    });
    this.requestMap.clear();
  }
}

import { Message, MessageID } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL;
  protected peerWindow: Window | null = null;

  constructor(params: { url: string; peerWindow?: Window }) {
    this.url = new URL(params.url);
    this.peerWindow = params.peerWindow ?? null;
  }

  private connected = false;

  protected abstract setupPeerWindow(): Promise<void>;
  protected abstract handleIncomingMessage(_: Message): Promise<boolean>;

  protected async connect() {
    if (this.connected) return;
    window.addEventListener('message', this.eventListener.bind(this));
    await this.setupPeerWindow();
    this.connected = true;
  }

  protected disconnect() {
    this.connected = false;
    window.removeEventListener('message', this.eventListener.bind(this));
    this.rejectWaitingRequests();
  }

  async postMessage(message: Message, options?: { bypassTargetOriginCheck: boolean }) {
    await this.connect();
    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }
    this.peerWindow.postMessage(
      message, //
      options?.bypassTargetOriginCheck ? '*' : this.url.origin
    );
  }

  async postMessageForResponse(message: Message): Promise<Message> {
    this.postMessage(message);
    return new Promise((resolve, reject) => {
      this.requestMap.set(message.id, {
        resolve,
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
    if (event.origin !== this.url.origin) return;

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

import { Web3Response } from './type/Web3Response.js';
import { prepend0x } from ':core/type/util.js';

type ResponseCallback = (response: Web3Response) => void;

export class RelayEventManager {
  _nextRequestId = 0;
  callbacks = new Map<string, ResponseCallback>();

  public makeRequestId(): number {
    // max nextId == max int32 for compatibility with mobile
    this._nextRequestId = (this._nextRequestId + 1) % 0x7fffffff;
    const id = this._nextRequestId;
    const idStr = prepend0x(id.toString(16));
    // unlikely that this will ever be an issue, but just to be safe
    const callback = this.callbacks.get(idStr);
    if (callback) {
      this.callbacks.delete(idStr);
    }
    return id;
  }
}

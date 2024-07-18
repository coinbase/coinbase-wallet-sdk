import { EventEmitter } from 'expo-modules-core';

import { CB_KEYS_URL } from '../constants';
import { MessageID, RPCRequestMessage, RPCResponseMessage } from '../message';
import NativeCommunicatorModule from './NativeCommunicatorModule';

type MobileRPCRequestMessage = RPCRequestMessage & {
  sdkVersion: string;
  callbackUrl: string;
};

const emitter = new EventEmitter(NativeCommunicatorModule);

export class NativeCommunicator {
  private readonly url: string;
  private responseHandlers = new Map<MessageID, (_: RPCResponseMessage) => void>();

  constructor(url: string = CB_KEYS_URL) {
    this.url = url;
    emitter.addListener('onWalletClosed', this.clear);
  }

  postRequestAndWaitForResponse = (
    request: MobileRPCRequestMessage
  ): Promise<RPCResponseMessage> => {
    return new Promise((resolve) => {
      // 1. generate request URL
      const urlParams = new URLSearchParams();
      Object.entries(request).forEach(([key, value]) => {
        urlParams.append(key, JSON.stringify(value));
      });
      const requestUrl = new URL(this.url);
      requestUrl.search = urlParams.toString();

      // 2. save response
      this.responseHandlers.set(request.id, resolve);

      // 3. send request via native module
      NativeCommunicatorModule.openWalletWithUrl(requestUrl.toString());
    });
  };

  handleResponse = (responseUrl: string) => {
    const urlParams = new URLSearchParams(responseUrl);

    const parseParam = <T>(paramName: string) => {
      return JSON.parse(urlParams.get(paramName) as string) as T;
    };

    const response: RPCResponseMessage = {
      id: parseParam<MessageID>('id'),
      sender: parseParam<string>('sender'),
      requestId: parseParam<MessageID>('requestId'),
      content: parseParam<RPCResponseMessage['content']>('content'),
      timestamp: new Date(parseParam<string>('timestamp')),
    };

    const handler = this.responseHandlers.get(response.requestId);
    if (handler) {
      handler(response);
      this.responseHandlers.delete(response.requestId);
      NativeCommunicatorModule.closeWallet();
    }
  };

  clear = () => {
    this.responseHandlers.clear();
  };
}

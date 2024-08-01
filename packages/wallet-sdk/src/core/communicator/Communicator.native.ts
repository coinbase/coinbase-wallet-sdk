import * as WebBrowser from 'expo-web-browser';

import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { MessageID, MobileRPCResponseMessage, RPCRequestMessage } from ':core/message';

export class Communicator {
  static communicators = new Map<string, Communicator>();

  private readonly url: string;
  private responseHandlers = new Map<MessageID, (_: MobileRPCResponseMessage) => void>();

  private constructor(url: string = CB_KEYS_URL) {
    this.url = url;
  }

  static getInstance(url: string = CB_KEYS_URL): Communicator {
    if (!this.communicators.has(url)) {
      this.communicators.set(url, new Communicator(url));
    }

    return this.communicators.get(url)!;
  }

  postRequestAndWaitForResponse = (
    request: RPCRequestMessage
  ): Promise<MobileRPCResponseMessage> => {
    return new Promise((resolve, reject) => {
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
      WebBrowser.openBrowserAsync(requestUrl.toString(), {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      })
        .then((result) => {
          if (result.type === 'cancel') {
            // iOS only: user cancelled the request
            reject(standardErrors.provider.userRejectedRequest());
            this.disconnect();
          }
        })
        .catch(() => {
          reject(standardErrors.provider.userRejectedRequest());
          this.disconnect();
        });
    });
  };

  handleResponse = (responseUrl: string): boolean => {
    const { searchParams } = new URL(responseUrl);
    const parseParam = <T>(paramName: string) => {
      return JSON.parse(searchParams.get(paramName) as string) as T;
    };

    const response: MobileRPCResponseMessage = {
      id: parseParam<MessageID>('id'),
      sender: parseParam<string>('sender'),
      requestId: parseParam<MessageID>('requestId'),
      content: parseParam<MobileRPCResponseMessage['content']>('content'),
      timestamp: new Date(parseParam<string>('timestamp')),
    };

    const handler = this.responseHandlers.get(response.requestId);
    if (handler) {
      handler(response);
      this.responseHandlers.delete(response.requestId);
      WebBrowser.dismissBrowser();
      return true;
    }
    return false;
  };

  private disconnect = () => {
    WebBrowser.dismissBrowser();
    this.responseHandlers.clear();
  };
}

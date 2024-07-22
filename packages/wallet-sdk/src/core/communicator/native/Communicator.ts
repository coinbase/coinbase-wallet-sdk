import * as WebBrowser from 'expo-web-browser';

import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { MessageID, RPCRequestMessage, RPCResponseMessage } from ':core/message';

type MobileRPCRequestMessage = RPCRequestMessage & {
  sdkVersion: string;
  callbackUrl: string;
};

export class Communicator {
  private readonly url: string;
  private responseHandlers = new Map<MessageID, (_: RPCResponseMessage) => void>();

  constructor(url: string = CB_KEYS_URL) {
    this.url = url;
  }

  postRequestAndWaitForResponse = (
    request: MobileRPCRequestMessage
  ): Promise<RPCResponseMessage> => {
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
            this.clear();
          }
        })
        .catch(() => {
          reject(standardErrors.provider.userRejectedRequest());
          this.clear();
        });
    });
  };

  handleResponse = (responseUrl: string) => {
    const { searchParams } = new URL(responseUrl);
    const parseParam = <T>(paramName: string) => {
      return JSON.parse(searchParams.get(paramName) as string) as T;
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
      WebBrowser.dismissBrowser();
    }
  };

  clear = () => {
    this.responseHandlers.clear();
  };
}

import { Communicator } from './Communicator.native';
import { CB_KEYS_URL, MOBILE_SDK_RESPONSE_PATH } from ':core/constants';

export function handleResponse(responseUrl: string, keysUrl: string = CB_KEYS_URL): boolean {
  const pathname = new URL(responseUrl).pathname;
  if (pathname.includes(MOBILE_SDK_RESPONSE_PATH)) {
    const communicator = Communicator.getInstance(keysUrl);
    return communicator.handleResponse(responseUrl);
  }
  return false;
}

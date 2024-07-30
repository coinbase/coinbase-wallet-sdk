import { Communicator } from './Communicator.native';
import { CB_KEYS_URL } from ':core/constants';

export function handleResponse(responseUrl: string, keysUrl: string = CB_KEYS_URL) {
  const communicator = Communicator.getInstance(keysUrl);
  communicator.handleResponse(responseUrl);
}

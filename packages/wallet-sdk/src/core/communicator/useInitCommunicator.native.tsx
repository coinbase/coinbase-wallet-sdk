import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { Communicator } from './Communicator.native';

export function useInitCommunicator(communicator: Communicator) {
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      const { path } = Linking.parse(event.url);

      if (path === 'coinbase-sdk/') {
        communicator.handleResponse(event.url);
      }
    });

    return subscription.remove;
  }, []);
}

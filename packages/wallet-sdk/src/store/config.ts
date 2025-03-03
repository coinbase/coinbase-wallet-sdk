import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { AppMetadata, Preference } from ':core/provider/interface.js';
import { VERSION } from '../sdk-info.js';

export type ConfigState = {
  metadata?: AppMetadata;
  preference?: Preference;
  headlessSubAccounts?: boolean;
  version: string;
};

export const sdkconfig = createStore(
  persist<ConfigState>(
    () => ({
      metadata: undefined,
      preference: undefined,
      headlessSubAccounts: false,
      version: VERSION,
    }),
    {
      name: 'cbwsdk.config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: ConfigState) => ({
        metadata: state.metadata,
        preference: state.preference,
        version: state.version,
        headlessSubAccounts: state.headlessSubAccounts,
      }),
    }
  )
);

export const config = {
  ...sdkconfig,
};

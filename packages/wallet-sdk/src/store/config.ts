import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { VERSION } from '../sdk-info.js';
import { AppMetadata, Preference } from ':core/provider/interface.js';

export type ConfigState = {
  metadata?: AppMetadata;
  preference?: Preference;
  version: string;
};

export const sdkconfig = createStore(
  persist<ConfigState>(
    () => ({
      metadata: undefined,
      preference: undefined,
      version: VERSION,
    }),
    {
      name: 'cbwsdk.config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: ConfigState) => ({
        metadata: state.metadata,
        preference: state.preference,
        version: state.version,
      }),
    }
  )
);

export const config = {
  ...sdkconfig,
};

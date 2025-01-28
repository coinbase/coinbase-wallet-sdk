import { createStore } from 'zustand/vanilla';

import { getAddress, getSigner, type } from './cryptokeys/signer.js';
import { SubAccountSigner } from './types.js';

type SubAccountState = {
  getSigner: SubAccountSigner['getSigner'];
  getAddress: SubAccountSigner['getAddress'];
  type: SubAccountSigner['type'];
};

export const SubAccount = createStore<SubAccountState>(() => ({
  getSigner,
  getAddress,
  type,
}));

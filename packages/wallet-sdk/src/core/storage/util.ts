import { ScopedAsyncStorage } from './ScopedAsyncStorage';

export async function clearAllStorage() {
  await Promise.all([
    new ScopedAsyncStorage('CBWSDK').clear(),
    new ScopedAsyncStorage('walletlink').clear(),
  ]);
}

import { ScopedAsyncStorage } from './ScopedAsyncStorage';

export async function clearAll() {
  await Promise.all([
    new ScopedAsyncStorage('CBWSDK').clear(),
    new ScopedAsyncStorage('walletlink').clear(),
  ]);
}

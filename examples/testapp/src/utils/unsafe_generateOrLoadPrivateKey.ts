import { generatePrivateKey } from 'viem/accounts';

/**
 * Generate a private key if it doesn't exist in local storage
 * or load the private key from local storage
 *
 * This is not safe, this is only for testing
 * In a real app you should not store/expose a private key
 * @returns a private key
 */
export function unsafe_generateOrLoadPrivateKey() {
  let privateKey = localStorage.getItem('cbwsdk.demo.add-sub-account.pk') as `0x${string}` | null;
  if (!privateKey) {
    privateKey = generatePrivateKey();
    localStorage.setItem('cbwsdk.demo.add-sub-account.pk', privateKey);
  }
  return privateKey;
}

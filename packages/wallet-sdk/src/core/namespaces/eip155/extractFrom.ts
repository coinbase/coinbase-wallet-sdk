import { RequestArguments } from ':core/provider/interface.js';

/**
 * Extract the signing/sending address from an EIP-1193 / CAIP-27 inner request,
 * if the dapp supplied one. `personal_sign` uses params[1]; `eth_sign` and typed
 * data use params[0]; wallet/transaction objects carry `address` / `from`.
 */
export function extractFrom(request: {
  method: string;
  params?: RequestArguments['params'];
}): string | undefined {
  // The object param form carries no positional signer, so it reads as empty here.
  const params: readonly unknown[] = Array.isArray(request.params) ? request.params : [];
  switch (request.method) {
    case 'eth_sign':
      return typeof params[0] === 'string' ? params[0] : undefined;
    case 'personal_sign':
    case 'personal_ecRecover':
    case 'eth_ecRecover':
      return typeof params[1] === 'string' ? params[1] : undefined;
    case 'eth_signTypedData':
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return typeof params[0] === 'string' ? params[0] : undefined;
    case 'wallet_sign': {
      const payload = params[0];
      if (
        payload &&
        typeof payload === 'object' &&
        'address' in payload &&
        typeof payload.address === 'string'
      ) {
        return payload.address;
      }
      return undefined;
    }
    case 'eth_sendTransaction':
    case 'eth_signTransaction':
    case 'wallet_sendCalls': {
      const tx = params[0];
      if (tx && typeof tx === 'object' && 'from' in tx && typeof tx.from === 'string') {
        return tx.from;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

import { RequestArguments } from ':core/provider/interface.js';

function paramsArray(params: RequestArguments['params']): unknown[] {
  return Array.isArray(params) ? [...params] : [];
}

/**
 * Extract the signing/sending address from an EIP-1193 request, if the dapp supplied one.
 * `personal_sign` uses params[1]; typed data uses params[0]; txs use params[0].from.
 */
export function extractFrom(request: RequestArguments): string | undefined {
  const params = paramsArray(request.params);
  switch (request.method) {
    case 'personal_sign':
    case 'personal_ecRecover':
    case 'eth_ecRecover':
      return typeof params[1] === 'string' ? params[1] : undefined;
    case 'eth_signTypedData':
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return typeof params[0] === 'string' ? params[0] : undefined;
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

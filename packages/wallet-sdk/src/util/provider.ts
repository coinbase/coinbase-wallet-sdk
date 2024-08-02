import { LIB_VERSION } from '../version';
import { standardErrors } from ':core/error';
import { ConstructorOptions, ProviderInterface, RequestArguments } from ':core/provider/interface';

export async function fetchRPCRequest(request: RequestArguments, rpcUrl: string) {
  const requestBody = {
    ...request,
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
  };
  const res = await window.fetch(rpcUrl, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    mode: 'cors',
    headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
  });
  const { result, error } = await res.json();
  if (error) throw error;
  return result;
}

export interface CBWindow {
  top: CBWindow;
  ethereum?: CBInjectedProvider;
  coinbaseWalletExtension?: CBInjectedProvider;
}

export interface CBInjectedProvider extends ProviderInterface {
  isCoinbaseBrowser?: boolean;
  setAppInfo?: (...args: unknown[]) => unknown;
}

function getCoinbaseInjectedLegacyProvider(): CBInjectedProvider | undefined {
  const window = globalThis as CBWindow;
  return window.coinbaseWalletExtension;
}

function getInjectedEthereum(): CBInjectedProvider | undefined {
  try {
    const window = globalThis as CBWindow;
    return window.ethereum ?? window.top?.ethereum;
  } catch {
    return undefined;
  }
}

export function getCoinbaseInjectedProvider({
  metadata,
  preference,
}: Readonly<ConstructorOptions>): ProviderInterface | undefined {
  if (preference.options !== 'smartWalletOnly') {
    const extension = getCoinbaseInjectedLegacyProvider();
    if (extension) {
      const { appName, appLogoUrl, appChainIds } = metadata;
      extension.setAppInfo?.(appName, appLogoUrl, appChainIds);
      return extension;
    }
  }

  const ethereum = getInjectedEthereum();
  if (ethereum?.isCoinbaseBrowser) {
    return ethereum;
  }

  return undefined;
}

/**
 * Validates the arguments for an invalid request and returns an error if any validation fails.
 * Valid request args are defined here: https://eips.ethereum.org/EIPS/eip-1193#request
 * @param args The request arguments to validate.
 * @returns An error object if the arguments are invalid, otherwise undefined.
 */
export function checkErrorForInvalidRequestArgs(args: unknown): asserts args is RequestArguments {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw standardErrors.rpc.invalidParams({
      message: 'Expected a single, non-array, object argument.',
      data: args,
    });
  }

  const { method, params } = args as RequestArguments;

  if (typeof method !== 'string' || method.length === 0) {
    throw standardErrors.rpc.invalidParams({
      message: "'args.method' must be a non-empty string.",
      data: args,
    });
  }

  if (
    params !== undefined &&
    !Array.isArray(params) &&
    (typeof params !== 'object' || params === null)
  ) {
    throw standardErrors.rpc.invalidParams({
      message: "'args.params' must be an object or array if provided.",
      data: args,
    });
  }

  switch (method) {
    case 'eth_sign':
    case 'eth_signTypedData_v2':
    case 'eth_subscribe':
    case 'eth_unsubscribe':
      throw standardErrors.provider.unsupportedMethod();
  }
}

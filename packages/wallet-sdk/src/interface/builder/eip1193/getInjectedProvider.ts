import { ProviderInterface } from ':core/provider/interface.js';
import { logGetInjectedProviderError } from ':core/telemetry/events/provider.js';
import { parseErrorMessageFromAny } from ':core/telemetry/utils.js';

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

const TBA_PROVIDER_IDENTIFIER = 'isCoinbaseBrowser';

type InjectedProvider = ProviderInterface & {
  [TBA_PROVIDER_IDENTIFIER]?: boolean;
};

export function getInjectedProvider(): InjectedProvider | null {
  try {
    const injectedProvider = window.top?.ethereum ?? window.ethereum;

    if (injectedProvider?.[TBA_PROVIDER_IDENTIFIER]) {
      return injectedProvider;
    }

    return null;
  } catch (error) {
    logGetInjectedProviderError({
      errorMessage: parseErrorMessageFromAny(error),
    });
    return null;
  }
}

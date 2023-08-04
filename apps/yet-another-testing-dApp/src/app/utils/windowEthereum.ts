import { CoinbaseWalletProvider } from "@coinbase/wallet-sdk";
import { ProviderType } from "@coinbase/wallet-sdk/dist/types";

import { isClient } from "@/app/utils/isClient";

type MultiProvider = {
  providerMap: Map<ProviderType, CoinbaseWalletProvider>;
};

function isMultiProvider(windowEthereum: unknown): windowEthereum is MultiProvider {
  return (
    typeof windowEthereum === "object" &&
    windowEthereum !== null &&
    "providerMap" in windowEthereum &&
    windowEthereum.providerMap instanceof Map
  );
}

function isWindowEthereum(windowEthereum: unknown): windowEthereum is Window["ethereum"] {
  return typeof windowEthereum === "object" && windowEthereum !== null;
}

function isCoinbaseWalletProvider(
  windowEthereum: unknown,
): windowEthereum is CoinbaseWalletProvider {
  return (
    Boolean(windowEthereum) &&
    isWindowEthereum(windowEthereum) &&
    "isCoinbaseWallet" in windowEthereum! &&
    windowEthereum.isCoinbaseWallet === true
  );
}

function getCoinbaseWalletProvider(): CoinbaseWalletProvider | undefined {
  if (!isClient) return undefined;

  if (isMultiProvider(window.ethereum)) {
    return window.ethereum.providerMap.get(ProviderType.CoinbaseWallet);
  }

  if (isCoinbaseWalletProvider(window.ethereum)) {
    return window.ethereum;
  }

  return undefined;
}

function getWindowEthereum(): Window["ethereum"] | undefined {
  if (!isClient) return undefined;

  if (isWindowEthereum(window.ethereum)) {
    return window.ethereum;
  }

  return undefined;
}

export const coinbaseProvider = getCoinbaseWalletProvider();

export const windowEthereum = getWindowEthereum();

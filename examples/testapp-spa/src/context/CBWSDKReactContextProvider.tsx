import {
  CoinbaseWalletSDK as CoinbaseWalletSDKHEAD,
  Preference,
  ProviderInterface,
  CoinbaseWalletProvider as CoinbaseWalletProviderHead,
} from "@coinbase/wallet-sdk";
import {
  CoinbaseWalletSDK as CoinbaseWalletSDK372,
  CoinbaseWalletProvider as CoinbaseWalletProvider372,
} from "@coinbase/wallet-sdk-3.7.2";
import {
  CoinbaseWalletSDK as CoinbaseWalletSDK393,
  CoinbaseWalletProvider as CoinbaseWalletProvider393,
} from "@coinbase/wallet-sdk-3.9.3";
import {
  CoinbaseWalletSDK as CoinbaseWalletSDK404,
  CoinbaseWalletProvider as CoinbaseWalletProvider404,
} from "@coinbase/wallet-sdk-4.0.4";
import React, { useEffect, useMemo } from "react";

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

type CoinbaseWalletSDK =
  | CoinbaseWalletSDKHEAD
  | CoinbaseWalletSDK372
  | CoinbaseWalletSDK393
  | CoinbaseWalletSDK404;

type CoinbaseWalletProvider =
  | ProviderInterface
  | CoinbaseWalletProviderHead
  | CoinbaseWalletProvider372
  | CoinbaseWalletProvider393
  | CoinbaseWalletProvider404;

const CBWSDKReactContext = React.createContext(null);

const SELECTED_SDK_KEY = "selected_sdk_version";

export const sdkVersions = ["HEAD", "4.0.4", "3.9.3", "3.7.2"] as const;

export type SDKVersionType = (typeof sdkVersions)[number];

const SELECTED_SCW_URL_KEY = "scw_url";

export const scwUrls = [
  "https://keys.coinbase.com/connect",
  "https://keys-beta.coinbase.com/connect",
  "http://localhost:3005/connect",
] as const;

export type ScwUrlType = (typeof scwUrls)[number];

const OPTIONS_KEY = "option_key";

export const options = ["all", "smartWalletOnly", "eoaOnly"] as const;

export type OptionsType = (typeof options)[number];

declare global {
  interface Window {
    setPopupUrl: (url: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.setPopupUrl = (url: string) => {
    const communicator = (window.ethereum as any).communicator;
    if (communicator) {
      communicator.url = new URL(url);
    }
  };
}

function makePreference({ version, option }: { version?: string; option?: string }) {
  switch (version) {
    case "HEAD":
      return {
        options: option,
      };
    case "4.0.4":
      return {
        options: option,
      };
    case "3.9.3":
    case "3.7.2":
      return "jsonRpcUrlMock";
    default:
      return {
        options: "all",
      };
  }
}

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(
    undefined
  );
  const [option, setOption] = React.useState<Preference["options"] | undefined>(
    undefined
  );
  const [sdk, setSdk] = React.useState<CoinbaseWalletSDK | null>(null);
  const [provider, setProvider] = React.useState<CoinbaseWalletProvider | null>(
    null
  );
  const [scwUrl, setScwUrl] = React.useState<ScwUrlType | undefined>(undefined);

  useEffect(() => {
    if (version === undefined) {
      const savedVersion = localStorage.getItem(
        SELECTED_SDK_KEY
      ) as SDKVersionType;
      setVersion(
        sdkVersions.includes(savedVersion)
          ? (savedVersion as SDKVersionType)
          : sdkVersions[0]
      );
    }
  }, [version]);

  useEffect(() => {
    if (option === undefined) {
      const option = localStorage.getItem(OPTIONS_KEY) as OptionsType;
      setOption(options.includes(option) ? (option as OptionsType) : "all");
    }
  }, [option]);

  useEffect(() => {
    if (scwUrl === undefined) {
      const savedScwUrl = localStorage.getItem(
        SELECTED_SCW_URL_KEY
      ) as ScwUrlType;
      setScwUrl(
        scwUrls.includes(savedScwUrl) ? (savedScwUrl as ScwUrlType) : scwUrls[0]
      );
    }
  }, [scwUrl]);

  useEffect(() => {
    let cbwsdk;
    if (version === "HEAD" || version === "4.0.4") {
      const SDK =
        version === "HEAD" ? CoinbaseWalletSDKHEAD : CoinbaseWalletSDK404;
      cbwsdk = new SDK({
        appName: "SDK Playground",
        appChainIds: [84532, 8452],
      });
      setSdk(cbwsdk);
    } else if (version === "3.9.3" || version === "3.7.2") {
      const SDK =
        version === "3.9.3" ? CoinbaseWalletSDK393 : CoinbaseWalletSDK372;
      cbwsdk = new SDK({
        appName: "Test App",
        enableMobileWalletLink: true,
      });
      setSdk(cbwsdk);
    }
    if (!cbwsdk) {
      return;
    }

    const preference = makePreference({ version, option });
    const cbwprovider = cbwsdk.makeWeb3Provider(preference);
    // @ts-expect-error
    cbwprovider.on("disconnect", () => {
      location.reload();
    });
    window.ethereum = cbwprovider;
    setProvider(cbwprovider);
  }, [version, option]);

  useEffect(() => {
    if (version === "HEAD" || version === "4.0.4") {
      if (scwUrl) window.setPopupUrl?.(scwUrl);
    }
  }, [version, scwUrl, sdk]);

  const setPreference = (option: OptionsType) => {
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  };

  const setSDKVersion = (version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  };

  const setScwUrlAndSave = (url: ScwUrlType) => {
    localStorage.setItem(SELECTED_SCW_URL_KEY, url);
    setScwUrl(url);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      option,
      setPreference,
      sdkVersion: version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
    }),
    [
      sdk,
      provider,
      option,
      setPreference,
      version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
    ]
  );

  return (
    <CBWSDKReactContext.Provider value={ctx}>
      {children}
    </CBWSDKReactContext.Provider>
  );
}

export function useCBWSDK() {
  const context = React.useContext(CBWSDKReactContext);
  if (context === undefined) {
    throw new Error("useCBWSDK must be used within a CBWSDKProvider");
  }
  return context;
}

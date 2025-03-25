import { Preference } from '@coinbase/wallet-sdk';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  OPTIONS_KEY,
  OptionsType,
  SDKVersionType,
  SELECTED_SCW_URL_KEY,
  SELECTED_SDK_KEY,
  ScwUrlType,
  options,
  scwUrls,
  sdkVersions,
} from '../store/config';

type ConfigParamsContextProviderProps = {
  children: React.ReactNode;
};

const ConfigParamsContext = React.createContext(null);

export const ConfigParamsContextProvider = ({ children }: ConfigParamsContextProviderProps) => {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [option, setOption] = React.useState<OptionsType | undefined>(undefined);
  const [scwUrl, setScwUrl] = React.useState<ScwUrlType | undefined>(undefined);
  const [config, setConfig] = React.useState<Preference>({
    options: option,
    attribution: {
      auto: false,
    },
  });

  useEffect(
    function initializeSDKVersion() {
      if (version === undefined) {
        const savedVersion = localStorage.getItem(SELECTED_SDK_KEY) as SDKVersionType;
        setVersion(
          sdkVersions.includes(savedVersion) ? (savedVersion as SDKVersionType) : sdkVersions[0]
        );
      }
    },
    [version]
  );

  useEffect(
    function initializeOption() {
      if (option === undefined) {
        const option = localStorage.getItem(OPTIONS_KEY) as OptionsType;
        setOption(options.includes(option) ? (option as OptionsType) : 'all');
      }
    },
    [option]
  );

  useEffect(
    function initializeScwUrl() {
      if (scwUrl === undefined) {
        const savedScwUrl = localStorage.getItem(SELECTED_SCW_URL_KEY) as ScwUrlType;
        setScwUrl(scwUrls.includes(savedScwUrl) ? (savedScwUrl as ScwUrlType) : scwUrls[0]);
      }
    },
    [scwUrl]
  );

  const setPreference = useCallback((option: OptionsType) => {
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  }, []);

  const setSDKVersion = useCallback((version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  }, []);

  const setScwUrlAndSave = useCallback((url: ScwUrlType) => {
    localStorage.setItem(SELECTED_SCW_URL_KEY, url);
    setScwUrl(url);
  }, []);

  const value = useMemo(() => {
    return {
      version,
      option,
      scwUrl,
      config,
      setPreference,
      setSDKVersion,
      setScwUrlAndSave,
      setConfig,
    };
  }, [version, option, scwUrl, config, setPreference, setSDKVersion, setScwUrlAndSave]);

  return <ConfigParamsContext.Provider value={value}>{children}</ConfigParamsContext.Provider>;
};

export function useConfigParams() {
  const context = React.useContext(ConfigParamsContext);
  if (context === undefined) {
    throw new Error('useConfigParams must be used within a ConfigParamsContextProvider');
  }
  return context;
}

import { Preference } from '@coinbase/wallet-sdk';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import { cleanupSDKLocalStorage } from '../utils/cleanupSDKLocalStorage';

type ConfigContextProviderProps = {
  children: ReactNode;
};

type ConfigContextType = {
  version: SDKVersionType | undefined;
  option: OptionsType | undefined;
  scwUrl: ScwUrlType | undefined;
  config: Preference;
  setPreference: Dispatch<SetStateAction<OptionsType>>;
  setSDKVersion: Dispatch<SetStateAction<SDKVersionType>>;
  setScwUrlAndSave: Dispatch<SetStateAction<ScwUrlType>>;
  setConfig: Dispatch<SetStateAction<Preference>>;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigContextProvider = ({ children }: ConfigContextProviderProps) => {
  const [version, setVersion] = useState<SDKVersionType | undefined>(undefined);
  const [option, setOption] = useState<OptionsType | undefined>(undefined);
  const [scwUrl, setScwUrl] = useState<ScwUrlType | undefined>(undefined);
  const [config, setConfig] = useState<Preference>({
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
    cleanupSDKLocalStorage();
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  }, []);

  const setSDKVersion = useCallback((version: SDKVersionType) => {
    cleanupSDKLocalStorage();
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  }, []);

  const setScwUrlAndSave = useCallback((url: ScwUrlType) => {
    cleanupSDKLocalStorage();
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

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigContextProvider');
  }
  return context;
}

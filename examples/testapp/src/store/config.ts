import latestPkgJson from '@coinbase/wallet-sdk-latest/package.json';

export const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['HEAD', latestPkgJson.version] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

export const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
  'https://keys.coinbase.com/connect',
  'https://keys-beta.coinbase.com/connect',
  'https://keys-dev.coinbase.com/connect',
  'http://localhost:3005/connect',
] as const;
export type ScwUrlType = (typeof scwUrls)[number];

export const OPTIONS_KEY = 'option_key';
export const options = ['all', 'smartWalletOnly', 'eoaOnly'] as const;
export type OptionsType = (typeof options)[number];

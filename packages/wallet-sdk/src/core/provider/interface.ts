import { EventEmitter } from 'eventemitter3';

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

interface ProviderConnectInfo {
  readonly chainId: string;
}

type ProviderEventMap = {
  connect: ProviderConnectInfo;
  disconnect: ProviderRpcError;
  chainChanged: string; // hex string
  accountsChanged: string[];
};

export class ProviderEventEmitter extends EventEmitter<keyof ProviderEventMap> {}

export interface ProviderInterface extends ProviderEventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  disconnect(): Promise<void>;
  emit<K extends keyof ProviderEventMap>(event: K, ...args: [ProviderEventMap[K]]): boolean;
  on<K extends keyof ProviderEventMap>(event: K, listener: (_: ProviderEventMap[K]) => void): this;
}

export type ProviderEventCallback = ProviderInterface['emit'];

export interface AppMetadata {
  /** Application name */
  appName: string;
  /** Application logo image URL; favicon is used if unspecified */
  appLogoUrl: string | null;
  /** Array of chainIds your dapp supports */
  appChainIds: number[];
}

type PostOnboardingAction = 'none' | 'onramp' | 'magicspend';

type OnrampPrefillOptions = {
  contractAddress?: string;
  amount: string;
  chainId: number;
};

export type Preference = {
  /**
   * @param options
   */
  options: 'all' | 'smartWalletOnly' | 'eoaOnly';
  /**
   * @param postOnboardingAction
   * @type {PostOnboardingAction}
   * @description Recommends the action to be taken after the onboarding process to engage users with various flows. Possible values:
   * - `none`: No action is recommended post-onboarding. (Default experience)
   * - `onramp`: Recommends initiating the onramp flow, allowing users to prefill their account with a specified asset, chain, and amount.
   * - `magicspend`: Suggests linking the users retail Coinbase account for seamless transactions.
   */
  postOnboardingAction?: PostOnboardingAction;
  /**
   * @param onrampPrefillOptions
   * @type {OnrampPrefillOptions}
   * @description This option only functions when `postOnboardingAction` is set to `onramp`.
   * - Prefills the onramp flow with the specified asset, chain, and suggested amount,
   * allowing users to prefill their account.
   * - Ensure the asset and chain are supported by the onramp provider
   * (e.g., Coinbase Pay - CBPay).
   */
  onrampPrefillOptions?: OnrampPrefillOptions;
  /**
   * @param attributionDataSuffix
   * @type {Hex}
   * @description Data suffix to be appended to the initCode or executeBatch calldata
   * Expects a 4 byte hex string
   */
  attributionDataSuffix?: string;
} & Record<string, unknown>;

export interface ConstructorOptions {
  metadata: AppMetadata;
  preference: Preference;
}

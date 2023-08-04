import { BrowserContext, Page } from "playwright-core";

import { Step, WalletOptions } from "./utils";

export default abstract class Wallet implements Dappwright {
  version: string | undefined;
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Name of the wallet
  static recommendedVersion: string;
  static releasesUrl: string;
  static homePath: string;

  // Extension downloader
  static download: (options: OfficialOptions) => Promise<string>;

  // Setup
  abstract setup: (options?: WalletOptions, steps?: Step<WalletOptions>[]) => Promise<void>;
  abstract defaultSetupSteps: Step<WalletOptions>[];

  // Wallet actions
  // abstract addNetwork: (options: AddNetwork) => Promise<void>;
  // abstract addToken: (options: AddToken) => Promise<void>;
  abstract approve: () => Promise<void>;
  // abstract createAccount: () => Promise<void>;
  // abstract confirmNetworkSwitch: () => Promise<void>;
  // abstract confirmTransaction: (options?: TransactionOptions) => Promise<void>;
  // abstract deleteAccount: (accountNumber: number) => Promise<void>;
  // abstract deleteNetwork: (name: string) => Promise<void>;
  // abstract getTokenBalance: (tokenSymbol: string) => Promise<number>;
  // abstract hasNetwork: (name: string) => Promise<boolean>;
  // abstract importPK: (pk: string) => Promise<void>;
  // abstract lock: () => Promise<void>;
  // abstract sign: () => Promise<void>;
  // abstract switchAccount: (accountNumber: number) => Promise<void>;
  // abstract switchNetwork: (network: string) => Promise<void>;
  // abstract unlock: (password?: string) => Promise<void>;
}

export type LaunchOptions = OfficialOptions | DappwrightBrowserLaunchArgumentOptions;

type DappwrightBrowserLaunchArgumentOptions = Omit<any, "headed">;

export type DappwrightConfig = Partial<{
  dappwright: LaunchOptions;
}>;

export type OfficialOptions = DappwrightBrowserLaunchArgumentOptions & {
  version: "latest" | string;
  headless?: boolean;
};

export type DappwrightLaunchResponse = {
  wallet: Wallet;
  browserContext: BrowserContext;
};

export type AddNetwork = {
  networkName: string;
  rpc: string;
  chainId: number;
  symbol: string;
};

export type AddToken = {
  tokenAddress: string;
  symbol?: string;
  decimals?: number;
};

export type TransactionOptions = {
  gas?: number;
  gasLimit?: number;
  priority: number;
};

export type Dappwright = {
  // addNetwork: (options: AddNetwork) => Promise<void>;
  // addToken: (options: AddToken) => Promise<void>;
  approve: () => Promise<void>;
  // confirmNetworkSwitch: () => Promise<void>;
  // confirmTransaction: (options?: TransactionOptions) => Promise<void>;
  // createAccount: () => Promise<void>;
  // deleteAccount: (accountNumber: number) => Promise<void>;
  // deleteNetwork: (name: string) => Promise<void>;
  // getTokenBalance: (tokenSymbol: string) => Promise<number>;
  // hasNetwork: (name: string) => Promise<boolean>;
  // importPK: (pk: string) => Promise<void>;
  // lock: () => Promise<void>;
  // sign: () => Promise<void>;
  // switchAccount: (accountNumber: number) => Promise<void>;
  // switchNetwork: (network: string) => Promise<void>;
  // unlock: (password?: string) => Promise<void>;

  page: Page;
};

import { Page } from "playwright-core";

import { approve, getStarted, navigateHome } from "./actions";
import { downloader } from "./downloader";
import Wallet from "./types";
import { Step, WalletOptions } from "./utils";

export const setup =
  (page: Page, defaultCoinbaseSteps: Step<WalletOptions>[]) =>
  async <Options = WalletOptions>(
    options?: Options,
    // @ts-ignore
    steps: Step<Options>[] = defaultCoinbaseSteps,
  ): Promise<void> => {
    // goes through the installation steps required by metamask
    for (const step of steps) {
      await step(page, options);
    }
  };

export class CoinbaseWallet extends Wallet {
  static recommendedVersion = "3.29.0";
  static releasesUrl = "https://api.github.com/repos/TenKeyLabs/coinbase-wallet-archive/releases";
  static homePath = "/index.html";

  options!: WalletOptions;

  // Extension Downloader
  static download = downloader(this.releasesUrl, this.recommendedVersion);

  // Setup
  // @ts-ignore
  defaultSetupSteps: Step<WalletOptions>[] = [getStarted, navigateHome];
  setup = setup(this.page, this.defaultSetupSteps);

  // Actions
  approve = approve(this.page);
}

import { chromium } from "@playwright/test";
import os from "os";
import * as path from "path";

import { CoinbaseWallet } from "./CoinbaseWalletExtension";
import { DappwrightLaunchResponse, OfficialOptions } from "./types";
import { getWallet } from "./utils";

/**
 * Launch Playwright chromium instance with wallet plugin installed
 * */
export const sessionPath = path.resolve(os.tmpdir(), "dappwright", "session");

export async function launch(options: OfficialOptions): Promise<DappwrightLaunchResponse> {
  const extensionPath = await CoinbaseWallet.download(options);

  const browserArgs = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];

  if (options.headless != false) browserArgs.push(`--headless=new`);

  const browserContext = await chromium.launchPersistentContext(
    path.join(sessionPath, "coinbase"),
    {
      headless: false,
      args: browserArgs,
    },
  );

  return {
    wallet: await getWallet(browserContext),
    browserContext,
  };
}

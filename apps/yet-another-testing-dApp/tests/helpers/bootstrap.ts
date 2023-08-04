import fs from "fs";
import * as path from "path";
import { BrowserContext, Page } from "playwright-core";

import { launch, sessionPath } from "./launch";
import { Dappwright, OfficialOptions } from "./types";
import { WalletOptions, getWallet } from "./utils";

export const bootstrap = async ({
  seed,
  password,
  showTestNets,
  ...launchOptions
}: OfficialOptions & WalletOptions): Promise<[Dappwright, Page, BrowserContext]> => {
  fs.rmSync(path.join(sessionPath), { recursive: true, force: true });
  const { browserContext } = await launch(launchOptions);
  const wallet = await getWallet(browserContext);
  await wallet.setup({ seed, password, showTestNets });

  return [wallet, wallet.page, browserContext];
};

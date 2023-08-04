import { type FullConfig } from "@playwright/test";
import fs from "fs";
import * as path from "path";

import { launch, sessionPath } from "./tests/helpers/launch";
import { getWallet } from "./tests/helpers/utils";

async function setup(config: FullConfig) {
  const { storageState } = config.projects[0].use;
  fs.rmSync(path.join(sessionPath), { recursive: true, force: true });
  const { browserContext } = await launch({
    headless: false,
    version: "3.26.2",
  });
  const wallet = await getWallet(browserContext);
  await wallet.setup({ headless: false });

  await wallet.page.context().storageState({ path: storageState as string });
  // await browserContext.close();
}

export default setup;

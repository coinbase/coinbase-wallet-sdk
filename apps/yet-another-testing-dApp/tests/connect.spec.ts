import { BrowserContext, test as baseTest, expect } from "@playwright/test";

import { CoinbaseWallet } from "./helpers/CoinbaseWalletExtension";
import { bootstrap } from "./helpers/bootstrap";
import { getWallet } from "./helpers/utils";

export const walletTest = baseTest.extend<{
  context: BrowserContext;
  wallet: CoinbaseWallet;
}>({
  context: async ({}, use) => {
    // Launch context with extension
    const [wallet, _, context] = await bootstrap({
      version: "3.29.0",
      headless: false,
    });

    await use(context);
  },

  wallet: async ({ context }, use) => {
    const coinbase = await getWallet(context);

    await use(coinbase);
  },
});

const librarySDKs = ["coinbase-wallet-sdk", "wagmi", "web3-react", "web3-onboard", "thirdweb"];

librarySDKs.forEach(async (libraryId) => {
  walletTest(`should connect with ${libraryId}`, async ({ context, wallet, page }) => {
    // Select Library
    await page.goto(`/libraries/${libraryId}`);

    // Connect
    await page.getByTestId(libraryId).click();

    if (libraryId === "web3-onboard") {
      // Web3 Onboarding modal
      await page.getByRole("button", { name: "Coinbase Wallet" }).click();
    }

    // Connect wallet
    await wallet.approve();
    const connectBtn = page.getByRole("button", { name: "Connected" });
    expect(connectBtn).toBeDisabled();
  });
});

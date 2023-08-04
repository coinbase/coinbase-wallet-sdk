import { ElementHandle } from "@playwright/test";
import { BrowserContext, Page } from "playwright-core";

import { CoinbaseWallet } from "./CoinbaseWalletExtension";
import { EXTENSION_ID } from "./downloader";

export const performPopupAction = async (
  page: Page,
  action: (popup: Page) => Promise<void>,
): Promise<void> => {
  const popup = await page.context().waitForEvent("page"); // Wait for the popup to show up

  await action(popup);
  if (!popup.isClosed()) await popup.waitForEvent("close");
};

export const waitForChromeState = async (page: Page, timeout: number = 6000): Promise<void> => {
  await page.waitForTimeout(timeout);
};

export const getElementByContent = (
  page: Page,
  text: string,
  type = "*",
): Promise<ElementHandle | null> => page.waitForSelector(`//${type}[contains(text(), '${text}')]`);

export const clickOnElement = async (page: Page, text: string, type?: string): Promise<void> => {
  const element = await getElementByContent(page, text, type);
  await element?.click();
};

export const clickOnButton = async (page: Page, text: string): Promise<void> => {
  const button = await getElementByContent(page, text, "button");
  await button?.click();
};

export type WalletOptions = {
  seed?: string;
  password?: string;
  showTestNets?: boolean;
};

export type Step<Options> = (page: Page, options?: Options) => void;

export const getWallet = async (browserContext: BrowserContext): Promise<CoinbaseWallet> => {
  if (browserContext.pages().length === 1) {
    let page: Page;
    //   try {
    //     const popupPromise = browserContext.waitForEvent("page", { timeout: 6000 });
    //     // Wait for the wallet to pop up
    //     page = await popupPromise;
    //     page.setViewportSize({ width: 375, height: 600 });
    //     return new CoinbaseWallet(page);
    //   } catch {
    // Open the wallet manually if tab doesn't pop up
    page = await browserContext.newPage();
    page.setViewportSize({ width: 375, height: 600 });

    await page.goto(`chrome-extension://${EXTENSION_ID}${CoinbaseWallet.homePath}`);
    // }

    return new CoinbaseWallet(page);
  }

  const page = browserContext.pages()[1];
  return new CoinbaseWallet(page);
};

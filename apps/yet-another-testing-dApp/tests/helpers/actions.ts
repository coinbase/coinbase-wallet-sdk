import { Page } from "playwright-core";

import { WalletOptions, performPopupAction, waitForChromeState } from "./utils";

const goHome = async (page: Page): Promise<void> => {
  await page.getByTestId("portfolio-navigation-link").click();
};

export const navigateHome = async (page: Page): Promise<void> => {
  await page.goto(page.url().split("?")[0]);
};

export async function getStarted(
  page: Page,
  {
    seed = "already turtle birth enroll since owner keep patch skirt drift any dinner",
    password = "password1234!!!!",
  }: WalletOptions,
): Promise<void> {
  await page.route(/(amp|metrics)$/, (route) => route.abort());

  // Welcome screen
  await page.getByTestId("btn-import-existing-wallet").click();

  // Import Wallet
  await page.getByTestId("btn-import-recovery-phrase").click();
  await page.getByTestId("secret-input").fill(seed);
  await page.getByTestId("btn-import-wallet").click();
  await page.getByTestId("setPassword").fill(password);
  await page.getByTestId("setPasswordVerify").fill(password);
  await page.getByTestId("terms-and-privacy-policy").check();
  await page.getByTestId("btn-password-continue").click();

  // Allow extension state/settings to settle
  await waitForChromeState(page);
}

export const approve = (page: Page) => async (): Promise<void> => {
  await performPopupAction(page, async (popup: Page) => {
    await popup.getByTestId("allow-authorize-button").click();
  });
};

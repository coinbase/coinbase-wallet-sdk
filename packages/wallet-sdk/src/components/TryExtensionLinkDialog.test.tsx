import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { h } from "preact";

import { TryExtensionLinkDialog } from "./TryExtensionLinkDialog";

const renderTryExtensionLinkDialog = ({
  connectDisabled = false,
  isConnected = true,
}) => {
  return render(
    <TryExtensionLinkDialog
      darkMode={false}
      version="1"
      sessionId="abcd"
      sessionSecret="efgh"
      linkAPIUrl="https://www.walletlink.org"
      isOpen
      isConnected={isConnected}
      isParentConnection={false}
      chainId={1}
      connectDisabled={connectDisabled}
      onCancel={null}
    />,
  );
};

const windowOpenSpy = jest.spyOn(window, "open");

describe("TryExtensionLinkDialog", () => {
  test("should show scan QR box when connectDisabled is false", async () => {
    renderTryExtensionLinkDialog({ connectDisabled: false });

    await waitFor(() => {
      expect(screen.queryByTestId("scan-qr-box")).toBeTruthy();
    });
  });

  test("should not show scan QR box when connectDisabled is true", async () => {
    renderTryExtensionLinkDialog({ connectDisabled: true });

    await waitFor(() => {
      expect(screen.queryByTestId("scan-qr-box")).toBeNull();
    });
  });

  test("should show connecting spinner when not connected", async () => {
    renderTryExtensionLinkDialog({ isConnected: false });

    await waitFor(() => {
      expect(screen.queryByTestId("connecting-spinner")).toBeTruthy();
    });
  });

  test("should navigate to extension store in new tab after pressing install", async () => {
    const mockedWindowOpen = jest.fn();
    windowOpenSpy.mockImplementation(mockedWindowOpen);

    renderTryExtensionLinkDialog({});

    await waitFor(async () => {
      const button = await screen.findByRole("button", { name: "Install" });
      fireEvent.click(button);
      expect(mockedWindowOpen).toBeCalledWith(
        "https://api.wallet.coinbase.com/rpc/v2/desktop/chrome",
        "_blank",
      );
    });
  });

  test("should show refresh button after pressing install", async () => {
    windowOpenSpy.mockImplementation(() => null);

    renderTryExtensionLinkDialog({});

    await waitFor(async () => {
      const button = await screen.findByRole("button", { name: "Install" });
      expect(button.textContent).toEqual("Install");

      fireEvent.click(button);
      expect(button.textContent).toEqual("Refresh");
    });
  });
});

import { initSnackbar } from ":util/web.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { presentAddOwnerDialog } from "./presentAddOwnerDialog.js";

vi.mock(":util/web.js", () => ({
  initSnackbar: vi.fn(),
}));

describe("presentAddOwnerDialog", () => {
  let mockSnackbar: {
    presentItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSnackbar = {
      presentItem: vi.fn(),
      clear: vi.fn(),
    };
    (initSnackbar as ReturnType<typeof vi.fn>).mockReturnValue(mockSnackbar);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should present snackbar with correct options", async () => {
    const promise = presentAddOwnerDialog();
    
    expect(mockSnackbar.presentItem).toHaveBeenCalledWith({
      autoExpand: true,
      message: "App requires a signer update",
      menuItems: expect.arrayContaining([
        expect.objectContaining({
          isRed: false,
          info: "Confirm",
        }),
        expect.objectContaining({
          isRed: true,
          info: "Cancel",
        }),
      ]),
    });

    // Simulate confirm click
    const confirmClick = mockSnackbar.presentItem.mock.calls[0][0].menuItems[0].onClick;
    confirmClick();
    
    await expect(promise).resolves.toBe("authenticate");
    expect(mockSnackbar.clear).toHaveBeenCalled();
  });

  it("should resolve with cancel when cancel is clicked", async () => {
    const promise = presentAddOwnerDialog();
    
    // Simulate cancel click
    const cancelClick = mockSnackbar.presentItem.mock.calls[0][0].menuItems[1].onClick;
    cancelClick();
    
    await expect(promise).resolves.toBe("cancel");
    expect(mockSnackbar.clear).toHaveBeenCalled();
  });
}); 
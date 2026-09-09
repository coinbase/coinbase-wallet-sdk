import { initDialog } from ':ui/Dialog/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { presentAddOwnerDialog } from './presentAddOwnerDialog.js';

vi.mock(':ui/Dialog/index.js', () => ({
  initDialog: vi.fn(),
}));

describe('presentAddOwnerDialog', () => {
  let mockDialog: {
    presentItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDialog = {
      presentItem: vi.fn(),
      clear: vi.fn(),
    };
    (initDialog as ReturnType<typeof vi.fn>).mockReturnValue(mockDialog);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should present snackbar with correct options', async () => {
    const promise = presentAddOwnerDialog();

    expect(mockDialog.presentItem).toHaveBeenCalledWith({
      title: expect.stringContaining('Re-authorize'),
      message: expect.stringContaining('has lost access to your account'),
      actionItems: expect.arrayContaining([
        expect.objectContaining({
          text: 'Continue',
          variant: 'primary',
        }),
        expect.objectContaining({
          text: 'Not now',
          variant: 'secondary',
        }),
      ]),
      onClose: expect.any(Function),
    });

    const confirmClick = mockDialog.presentItem.mock.calls[0][0].actionItems[0].onClick;
    confirmClick();

    await expect(promise).resolves.toBe('authenticate');
    expect(mockDialog.clear).toHaveBeenCalled();
  });

  it('should resolve with cancel when cancel is clicked', async () => {
    const promise = presentAddOwnerDialog();

    const cancelClick = mockDialog.presentItem.mock.calls[0][0].actionItems[1].onClick;
    cancelClick();

    await expect(promise).resolves.toBe('cancel');
    expect(mockDialog.clear).toHaveBeenCalled();
  });
});

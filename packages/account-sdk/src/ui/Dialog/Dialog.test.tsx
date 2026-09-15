import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/preact';
import { vi } from 'vitest';

import { sessionFromAccounts } from ':core/namespaces/eip155/session.js';
import { sessionFromSolanaAccounts } from ':core/namespaces/solana/session.js';
import { getDisplayableUsername } from ':core/username/getDisplayableUsername.js';
import type { Session } from ':core/session/types.js';

import { DialogContainer, DialogInstance, DialogInstanceProps } from './Dialog.js';

const { sessionRef } = vi.hoisted(() => ({
  sessionRef: { current: undefined as Session | undefined },
}));

// Dialog reads the canonical session directly; the persisted store is not under test here.
vi.mock(':store/store.js', () => ({
  store: { session: { get: () => sessionRef.current } },
}));

vi.mock(':core/username/getDisplayableUsername.js', () => ({
  getDisplayableUsername: vi.fn().mockResolvedValue('base.eth'),
}));

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

const renderDialogContainer = (props?: Partial<DialogInstanceProps>) =>
  render(
    <DialogContainer>
      <DialogInstance title="Test Title" message="Test message" handleClose={() => {}} {...props} />
    </DialogContainer>
  );

describe('DialogContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders with title and message', () => {
    renderDialogContainer();

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  test('renders hidden initially', () => {
    // Spy per test: a persistent window.setTimeout spy outlives the fake-timer swap
    // and leaves later suites without a usable timer.
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    renderDialogContainer();

    const hiddenClass = document.getElementsByClassName('-base-acc-sdk-dialog-instance-hidden');
    expect(hiddenClass.length).toEqual(1);

    vi.runAllTimers();
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });

  test('shows action button when provided', () => {
    const onClick = vi.fn();
    renderDialogContainer({
      actionItems: [
        {
          text: 'Try again',
          onClick,
          variant: 'primary',
        },
      ],
    });

    const button = screen.getByText('Try again');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('shows secondary button when provided', () => {
    const onClick = vi.fn();
    renderDialogContainer({
      actionItems: [
        {
          text: 'Cancel',
          onClick,
          variant: 'secondary',
        },
      ],
    });

    const button = screen.getByText('Cancel');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderDialogContainer({ handleClose });

    const closeButton = document.getElementsByClassName(
      '-base-acc-sdk-dialog-instance-header-close'
    )[0];
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('renders both buttons when provided', () => {
    const primaryClick = vi.fn();
    const secondaryClick = vi.fn();

    renderDialogContainer({
      actionItems: [
        {
          text: 'Primary',
          onClick: primaryClick,
          variant: 'primary',
        },
        {
          text: 'Secondary',
          onClick: secondaryClick,
          variant: 'secondary',
        },
      ],
    });

    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });
});

describe('DialogInstance session header', () => {
  afterEach(() => {
    sessionRef.current = undefined;
    vi.mocked(getDisplayableUsername).mockClear();
  });

  test('resolves the header username from the CAIP session', async () => {
    sessionRef.current = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

    renderDialogContainer();

    expect(await screen.findByText('Signed in as base.eth')).toBeInTheDocument();
    expect(getDisplayableUsername).toHaveBeenCalledWith(ADDRESS);
  });

  test('keeps the default header when the session grants no EIP-155 account', async () => {
    sessionRef.current = sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] });

    renderDialogContainer();

    expect(await screen.findByText('Base Account')).toBeInTheDocument();
    expect(getDisplayableUsername).not.toHaveBeenCalled();
  });
});

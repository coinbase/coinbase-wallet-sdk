import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanupSDKLocalStorage } from '../../utils/cleanupSDKLocalStorage';
import { DisconnectedAlert } from './DisconnectedAlert';

vi.mock('../../utils/cleanupSDKLocalStorage', () => ({
  cleanupSDKLocalStorage: vi.fn(),
}));

describe('DisconnectedAlert', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  test('renders correctly when isOpen is true', () => {
    const onClose = vi.fn();
    render(<DisconnectedAlert isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Wallet Disconnected')).toBeTruthy();
    expect(screen.getByText(/The wallet has been disconnected/)).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });

  test('does not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(<DisconnectedAlert isOpen={false} onClose={onClose} />);

    expect(container.textContent).not.toContain('Wallet Disconnected');
  });

  test('calls onClose when No button is clicked', () => {
    const onClose = vi.fn();
    render(<DisconnectedAlert isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('No'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('reloads page when Yes button is clicked', () => {
    const onClose = vi.fn();
    render(<DisconnectedAlert isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('Yes'));

    expect(cleanupSDKLocalStorage).toHaveBeenCalledTimes(1);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});

import { renderHook } from '@testing-library/react';
import * as Linking from 'expo-linking';

import { Communicator } from './Communicator';
import { useInitCommunicator } from './useInitCommunicator';

jest.mock('expo-web-browser');
jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(),
  parse: jest.fn(),
}));

describe('useInitCommunicator', () => {
  let mockCommunicator: jest.Mocked<Communicator>;
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    mockCommunicator = {
      handleResponse: jest.fn(),
    } as any;

    mockRemove = jest.fn();
    mockAddEventListener = jest.fn().mockReturnValue({ remove: mockRemove });
    (Linking.addEventListener as jest.Mock).mockImplementation(mockAddEventListener);
    (Linking.parse as jest.Mock).mockImplementation((url) => ({ path: url }));
  });

  it('should add event listener on mount', () => {
    renderHook(() => useInitCommunicator(mockCommunicator));

    expect(mockAddEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useInitCommunicator(mockCommunicator));

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should handle response when url path is "coinbase-sdk/"', () => {
    renderHook(() => useInitCommunicator(mockCommunicator));

    const handler = mockAddEventListener.mock.calls[0][1];
    handler({ url: 'coinbase-sdk/' });

    expect(mockCommunicator.handleResponse).toHaveBeenCalledWith('coinbase-sdk/');
  });

  it('should not handle response when url path is not "coinbase-sdk/"', () => {
    renderHook(() => useInitCommunicator(mockCommunicator));

    const handler = mockAddEventListener.mock.calls[0][1];
    handler({ url: 'other-path/' });

    expect(mockCommunicator.handleResponse).not.toHaveBeenCalled();
  });
});

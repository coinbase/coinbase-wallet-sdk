import { vi } from 'vitest';

import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../constants.js';
import { WalletLinkSession } from '../type/WalletLinkSession.js';
import { WalletLinkCipher } from './WalletLinkCipher.js';
import {
    WalletLinkConnection,
    WalletLinkConnectionUpdateListener,
} from './WalletLinkConnection.js';
import { ConnectionState } from './WalletLinkWebSocket.js';

const decryptMock = vi.fn().mockImplementation((text) => Promise.resolve(`decrypted ${text}`));

vi.spyOn(WalletLinkCipher.prototype, 'decrypt').mockImplementation(decryptMock);

const HEARTBEAT_INTERVAL = 10000;

// Mock WebSocket to prevent real connections
vi.mock('./WalletLinkWebSocket.js', () => {
  return {
    ConnectionState: {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
    },
    WalletLinkWebSocket: vi.fn().mockImplementation(() => {
      const mockWs = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        sendData: vi.fn(),
        setConnectionStateListener: vi.fn(),
        setIncomingDataListener: vi.fn(),
        cleanup: vi.fn(),
      };
      return mockWs;
    }),
  };
});

// Mock window timer functions
beforeEach(() => {
  vi.stubGlobal('setInterval', vi.fn());
  vi.stubGlobal('clearInterval', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WalletLinkConnection', () => {
  const session = WalletLinkSession.create(new ScopedLocalStorage('walletlink', 'test'));

  let connection: WalletLinkConnection;
  let listener: WalletLinkConnectionUpdateListener;

  beforeEach(() => {
    vi.clearAllMocks();

    listener = {
      linkedUpdated: vi.fn(),
      handleWeb3ResponseMessage: vi.fn(),
      chainUpdated: vi.fn(),
      accountUpdated: vi.fn(),
      metadataUpdated: vi.fn(),
      resetAndReload: vi.fn(),
    };

    connection = new WalletLinkConnection({
      session,
      linkAPIUrl: 'http://link-api-url',
      listener,
    });
  });

  afterEach(async () => {
    // Only destroy if connection exists and hasn't been destroyed
    if (connection && !(connection as any).destroyed) {
      // Mock the makeRequest to prevent timeout errors
      vi.spyOn(connection as any, 'makeRequest').mockResolvedValue({ type: 'SetSessionConfigOK' });
      await connection.destroy();
    }
  });

  describe('incomingDataListener', () => {
    it('should call handleSessionMetadataUpdated when session config is updated', async () => {
      const handleSessionMetadataUpdatedSpy = vi.spyOn(
        connection as any,
        'handleSessionMetadataUpdated'
      );

      const sessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          WalletUsername: 'new username',
        },
      };

      // Get the incoming data listener from the mock
      const ws = (connection as any).ws;
      const incomingDataListener = ws.setIncomingDataListener.mock.calls[0][0];

      // Call the listener with the session config
      incomingDataListener({
        ...sessionConfig,
        type: 'SessionConfigUpdated',
      });

      expect(handleSessionMetadataUpdatedSpy).toHaveBeenCalledWith(sessionConfig.metadata);
    });
  });

  describe('handleSessionMetadataUpdated', () => {
    function invoke_handleSessionMetadataUpdated(metadata: { [_: string]: string }) {
      (connection as any).handleSessionMetadataUpdated(metadata);
    }

    it('should call listener.metadataUpdated when WalletUsername updated', async () => {
      const listener_metadataUpdatedSpy = vi.spyOn(listener, 'metadataUpdated');

      const newUsername = 'new username';

      invoke_handleSessionMetadataUpdated({ WalletUsername: newUsername });

      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        WALLET_USER_NAME_KEY,
        await decryptMock(newUsername)
      );
    });

    it('should call listener.metadataUpdated when AppVersion updated', async () => {
      const listener_metadataUpdatedSpy = vi.spyOn(listener, 'metadataUpdated');

      const newAppVersion = 'new app version';

      invoke_handleSessionMetadataUpdated({ AppVersion: newAppVersion });

      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        APP_VERSION_KEY,
        await decryptMock(newAppVersion)
      );
    });

    it('should call listener.resetAndReload when __destroyed: 1 is received', async () => {
      const listener_resetAndReloadSpy = vi.spyOn(listener, 'resetAndReload');

      invoke_handleSessionMetadataUpdated({ __destroyed: '1' });

      expect(listener_resetAndReloadSpy).toHaveBeenCalled();
    });

    it('should call listener.accountUpdated when Account updated', async () => {
      const listener_accountUpdatedSpy = vi.spyOn(listener, 'accountUpdated');

      const newAccount = 'new account';

      invoke_handleSessionMetadataUpdated({ EthereumAddress: newAccount });

      expect(listener_accountUpdatedSpy).toHaveBeenCalledWith(await decryptMock(newAccount));
    });

    describe('chain updates', () => {
      it('should NOT call listener.chainUpdated when only one changed', async () => {
        const listener_chainUpdatedSpy = vi.spyOn(listener, 'chainUpdated');

        const chainIdUpdate = { ChainId: 'new chain id' };
        const jsonRpcUrlUpdate = { JsonRpcUrl: 'new json rpc url' };

        invoke_handleSessionMetadataUpdated(chainIdUpdate);
        invoke_handleSessionMetadataUpdated(jsonRpcUrlUpdate);

        await decryptMock(chainIdUpdate.ChainId);

        expect(listener_chainUpdatedSpy).not.toHaveBeenCalled();
      });

      it('should call listener.chainUpdated when both ChainId and JsonRpcUrl changed', async () => {
        const listener_chainUpdatedSpy = vi.spyOn(listener, 'chainUpdated');

        const update = {
          ChainId: 'new chain id',
          JsonRpcUrl: 'new json rpc url',
        };

        invoke_handleSessionMetadataUpdated(update);

        expect(listener_chainUpdatedSpy).toHaveBeenCalledWith(
          await decryptMock(update.ChainId),
          await decryptMock(update.JsonRpcUrl)
        );
      });
    });
  });

  describe('visibility and focus handling', () => {
    let visibilityChangeHandler: () => void;
    let focusHandler: () => void;
    let pageshowHandler: (event: PageTransitionEvent) => void;

    beforeEach(() => {
      // Capture event handlers
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Create a new connection to capture the handlers
      connection = new WalletLinkConnection({
        session,
        linkAPIUrl: 'http://link-api-url',
        listener,
      });

      // Extract the handlers
      visibilityChangeHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1] as () => void;

      focusHandler = windowAddEventListenerSpy.mock.calls.find(
        call => call[0] === 'focus'
      )?.[1] as () => void;

      pageshowHandler = windowAddEventListenerSpy.mock.calls.find(
        call => call[0] === 'pageshow'
      )?.[1] as (event: PageTransitionEvent) => void;
    });

    it('should set up visibility change and focus handlers on construction', () => {
      expect(visibilityChangeHandler).toBeDefined();
      expect(focusHandler).toBeDefined();
      expect(pageshowHandler).toBeDefined();
    });

    it('should reconnect with fresh WebSocket when document becomes visible and disconnected', () => {
      const reconnectSpy = vi.spyOn(connection as any, 'reconnectWithFreshWebSocket');
      
      // Set disconnected state
      (connection as any)._connected = false;
      
      // Mock document.hidden as false (visible)
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      visibilityChangeHandler();

      expect(reconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should send heartbeat when document becomes visible and connected', () => {
      const heartbeatSpy = vi.spyOn(connection as any, 'heartbeat').mockImplementation(() => {});
      
      // Set connected state
      (connection as any)._connected = true;
      
      // Mock document.hidden as false (visible)
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      visibilityChangeHandler();

      expect(heartbeatSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reconnect when document is hidden', () => {
      const reconnectSpy = vi.spyOn(connection as any, 'reconnectWithFreshWebSocket');
      
      // Mock document.hidden as true
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      visibilityChangeHandler();

      expect(reconnectSpy).not.toHaveBeenCalled();
    });

    it('should reconnect on focus event when disconnected', () => {
      const reconnectSpy = vi.spyOn(connection as any, 'reconnectWithFreshWebSocket');
      
      // Set disconnected state
      (connection as any)._connected = false;
      (connection as any).destroyed = false;

      focusHandler();

      expect(reconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reconnect on focus event when connected', () => {
      const reconnectSpy = vi.spyOn(connection as any, 'reconnectWithFreshWebSocket');
      
      // Set connected state
      (connection as any)._connected = true;

      focusHandler();

      expect(reconnectSpy).not.toHaveBeenCalled();
    });

    it('should handle pageshow event with persisted flag', () => {
      const reconnectSpy = vi.spyOn(connection as any, 'reconnectWithFreshWebSocket');
      
      // Set disconnected state
      (connection as any)._connected = false;

      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: true });

      pageshowHandler(event);

      expect(reconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should remove event listeners on destroy', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Mock makeRequest to prevent timeout
      vi.spyOn(connection as any, 'makeRequest').mockResolvedValue({ type: 'SetSessionConfigOK' });

      await connection.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', visibilityChangeHandler);
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('focus', focusHandler);
    });
  });

  describe('reconnectWithFreshWebSocket', () => {
    it('should disconnect old WebSocket and create new one', () => {
      const oldWs = (connection as any).ws;
      const disconnectSpy = vi.spyOn(oldWs, 'disconnect');
      
      (connection as any).reconnectWithFreshWebSocket();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(oldWs.cleanup).toHaveBeenCalledTimes(1);
      
      // New WebSocket should be created
      expect((connection as any).ws).not.toBe(oldWs);
      // activeWsInstance should point to the new WebSocket
      expect((connection as any).activeWsInstance).toBe((connection as any).ws);
    });

    it('should not reconnect if destroyed', () => {
      (connection as any).destroyed = true;
      const oldWs = (connection as any).ws;
      const disconnectSpy = vi.spyOn(oldWs, 'disconnect');

      (connection as any).reconnectWithFreshWebSocket();

      expect(disconnectSpy).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket connection state handling', () => {
    let ws: any;
    let stateListener: (state: ConnectionState) => void;

    beforeEach(() => {
      ws = (connection as any).ws;
      stateListener = ws.setConnectionStateListener.mock.calls[0][0];
    });

    it('should track active WebSocket instance', () => {
      expect((connection as any).activeWsInstance).toBe(ws);
    });

    it('should ignore events from non-active WebSocket instances', async () => {
      // Mock handleConnected to track if connection logic runs
      const handleConnectedSpy = vi.spyOn(connection as any, 'handleConnected');
      
      // Create a different WebSocket instance
      const oldWs = ws;
      (connection as any).activeWsInstance = { different: 'instance' };
      
      // Trigger state change on old instance
      await stateListener.call(oldWs, ConnectionState.CONNECTED);
      
      // Connection logic should not run for non-active instances
      expect(handleConnectedSpy).not.toHaveBeenCalled();
    });

    it('should handle reconnection with delay', async () => {
      vi.useFakeTimers();
      
      // First disconnection - no delay
      (connection as any).reconnectAttempts = 0;
      (connection as any).activeWsInstance = ws;
      await stateListener(ConnectionState.DISCONNECTED);
      
      // Wait for the async reconnect function to execute
      await vi.runAllTimersAsync();
      expect((connection as any).reconnectAttempts).toBe(1);
      
      // Reset for second disconnection
      (connection as any).isReconnecting = false;
      (connection as any).activeWsInstance = ws;
      (connection as any).destroyed = false;
      
      // Second disconnection - 3 second delay
      await stateListener(ConnectionState.DISCONNECTED);
      
      // The reconnection should be delayed by 3 seconds
      vi.advanceTimersByTime(2999);
      expect((connection as any).reconnectAttempts).toBe(1); // Still 1, not incremented yet
      
      // Complete the delay and allow async operations
      await vi.advanceTimersByTimeAsync(1);
      expect((connection as any).reconnectAttempts).toBe(2);
      
      vi.useRealTimers();
    });

    it('should prevent concurrent reconnection attempts', async () => {
      (connection as any).isReconnecting = true;
      (connection as any).activeWsInstance = ws;
      const createWebSocketSpy = vi.spyOn(connection as any, 'createWebSocket');
      
      await stateListener(ConnectionState.DISCONNECTED);
      
      expect(createWebSocketSpy).not.toHaveBeenCalled();
    });

    it('should reset reconnect attempts on successful connection', async () => {
      (connection as any).reconnectAttempts = 5;
      (connection as any).activeWsInstance = ws;
      vi.spyOn(connection as any, 'handleConnected').mockResolvedValue(true);
      vi.spyOn(connection as any, 'fetchUnseenEventsAPI').mockResolvedValue([]);
      
      await stateListener(ConnectionState.CONNECTED);
      
      expect((connection as any).reconnectAttempts).toBe(0);
    });

    it('should cleanup old WebSocket on reconnection', async () => {
      vi.useFakeTimers();
      (connection as any).activeWsInstance = ws;
      (connection as any).destroyed = false;
      
      await stateListener(ConnectionState.DISCONNECTED);
      
      // Wait for the async reconnect function to execute
      await vi.runAllTimersAsync();
      
      expect(ws.cleanup).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('should clear and restart heartbeat timer on connection state changes', async () => {
      // Use the globally mocked functions
      const clearIntervalMock = vi.mocked(clearInterval);
      const setIntervalMock = vi.mocked(setInterval);
      
      // Mock setInterval to return a numeric ID
      setIntervalMock.mockReturnValue(456 as any);
      
      // Mock successful connection
      (connection as any).activeWsInstance = ws;
      vi.spyOn(connection as any, 'handleConnected').mockResolvedValue(true);
      vi.spyOn(connection as any, 'fetchUnseenEventsAPI').mockResolvedValue([]);
      
      // Simulate connected state
      await stateListener(ConnectionState.CONNECTED);
      expect(setIntervalMock).toHaveBeenCalledWith(expect.any(Function), HEARTBEAT_INTERVAL);
      expect((connection as any).heartbeatIntervalId).toBe(456);
      
      // Simulate disconnected state
      await stateListener(ConnectionState.DISCONNECTED);
      expect(clearIntervalMock).toHaveBeenCalledWith(456);
      expect((connection as any).heartbeatIntervalId).toBeUndefined();
    });

    it('should reset lastHeartbeatResponse on disconnect', async () => {
      (connection as any).lastHeartbeatResponse = Date.now();
      (connection as any).activeWsInstance = ws;
      
      await stateListener(ConnectionState.DISCONNECTED);
      
      expect((connection as any).lastHeartbeatResponse).toBe(0);
    });

    it('should send immediate heartbeat after connection', async () => {
      vi.useFakeTimers();
      const heartbeatSpy = vi.spyOn(connection as any, 'heartbeat').mockImplementation(() => {});
      (connection as any).activeWsInstance = ws;
      vi.spyOn(connection as any, 'handleConnected').mockResolvedValue(true);
      vi.spyOn(connection as any, 'fetchUnseenEventsAPI').mockResolvedValue([]);
      
      // Mock setTimeout for the immediate heartbeat
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      await stateListener(ConnectionState.CONNECTED);
      
      // Check that setTimeout was called for immediate heartbeat
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
      
      // Execute the immediate heartbeat
      vi.advanceTimersByTime(100);
      expect(heartbeatSpy).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });


  });

  describe('heartbeat mechanism', () => {
    beforeEach(() => {
      // Mock makeRequest to prevent actual network calls
      vi.spyOn(connection as any, 'makeRequest').mockResolvedValue({ type: 'Heartbeat' });
    });

    it('should update lastHeartbeatResponse on heartbeat', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      
      (connection as any).updateLastHeartbeat();
      
      expect((connection as any).lastHeartbeatResponse).toBe(now);
    });

    it('should handle heartbeat timeout and disconnect', () => {
      const ws = (connection as any).ws;
      const disconnectSpy = vi.spyOn(ws, 'disconnect');
      
      // Set last heartbeat response to more than 2 intervals ago
      (connection as any).lastHeartbeatResponse = Date.now() - (HEARTBEAT_INTERVAL * 3);
      (connection as any)._connected = true;
      
      (connection as any).heartbeat();
      
      // Should disconnect the WebSocket instead of calling reconnectWithFreshWebSocket
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should send heartbeat message when connection is healthy', () => {
      const ws = (connection as any).ws;
      const sendDataSpy = vi.spyOn(ws, 'sendData');
      
      // Set recent heartbeat response
      (connection as any).lastHeartbeatResponse = Date.now();
      (connection as any)._connected = true;
      
      (connection as any).heartbeat();
      
      // Should send 'h' as heartbeat message
      expect(sendDataSpy).toHaveBeenCalledWith('h');
    });
  });

  describe('cleanup on destroy', () => {
    beforeEach(() => {
      // Mock makeRequest to prevent timeout errors
      vi.spyOn(connection as any, 'makeRequest').mockResolvedValue({ type: 'SetSessionConfigOK' });
    });

    it('should cleanup WebSocket instance if cleanup method exists', async () => {
      const ws = (connection as any).ws;
      
      await connection.destroy();
      
      expect(ws.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should clear activeWsInstance on destroy', async () => {
      expect((connection as any).activeWsInstance).toBeDefined();
      
      await connection.destroy();
      
      expect((connection as any).activeWsInstance).toBeUndefined();
    });

    it('should clear heartbeat interval on destroy', async () => {
      // clearInterval is already mocked globally
      const clearIntervalMock = vi.mocked(clearInterval);
      
      // Set up a heartbeat interval
      (connection as any).heartbeatIntervalId = 123;
      
      await connection.destroy();
      
      expect(clearIntervalMock).toHaveBeenCalledWith(123);
      expect((connection as any).heartbeatIntervalId).toBeUndefined();
    });
  });


});

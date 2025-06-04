// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>


/**
 * This worker is used to send heartbeat messages to the main thread.
 * It is used to keep the websocket connection alive when the webpage is backgrounded.
 * 
 */

const HEARTBEAT_INTERVAL = 10000; // 10 seconds

type WorkerMessage = {
  type: 'start' | 'stop';
}

export type WorkerResponse = {
  type: 'heartbeat' | 'started' | 'stopped';
}

let heartbeatInterval: NodeJS.Timeout | undefined;

// Listen for messages from the main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  switch (type) {
    case 'start':
      startHeartbeat();
      break;
    case 'stop':
      stopHeartbeat();
      break;
    default:
      console.warn('Unknown message type received by HeartbeatWorker:', type);
  }
});

function startHeartbeat(): void {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Start the heartbeat interval
  heartbeatInterval = setInterval(() => {
    // Send heartbeat message to main thread
    const response: WorkerResponse = { type: 'heartbeat' };
    self.postMessage(response);
  }, HEARTBEAT_INTERVAL);

  // Send confirmation that heartbeat started
  const response: WorkerResponse = { type: 'started' };
  self.postMessage(response);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = undefined;
  }

  // Send confirmation that heartbeat stopped
  const response: WorkerResponse = { type: 'stopped' };
  self.postMessage(response);
}

// Handle worker termination
self.addEventListener('beforeunload', () => {
  stopHeartbeat();
});

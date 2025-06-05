// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * This worker is used to send heartbeat messages to the main thread.
 * It is used to keep the websocket connection alive when the webpage is backgrounded.
 * 
 */

// Define the heartbeat interval constant directly in the worker to avoid import issues
const HEARTBEAT_INTERVAL = 10000;

let heartbeatInterval;

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
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

function startHeartbeat() {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Start the heartbeat interval
  heartbeatInterval = setInterval(() => {
    // Send heartbeat message to main thread
    const response = { type: 'heartbeat' };
    self.postMessage(response);
  }, HEARTBEAT_INTERVAL);

  // Send confirmation that heartbeat started
  const response = { type: 'started' };
  self.postMessage(response);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = undefined;
  }

  // Send confirmation that heartbeat stopped
  const response = { type: 'stopped' };
  self.postMessage(response);
}

// Handle worker termination
self.addEventListener('beforeunload', () => {
  stopHeartbeat();
}); 
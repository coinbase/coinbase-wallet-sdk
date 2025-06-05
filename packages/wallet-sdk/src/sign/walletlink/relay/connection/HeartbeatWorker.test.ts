import '@vitest/web-worker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('HeartbeatWorker', () => {
  let worker: Worker;

  beforeEach(async () => {
    // Create a new worker instance for each test
    worker = new Worker(new URL('./HeartbeatWorker.js', import.meta.url));
  });

  afterEach(() => {
    if (worker) {
      worker.terminate();
    }
  });

  describe('Message Handling', () => {
    it('should start heartbeat and send confirmation', async () => {
      const messagePromise = new Promise<MessageEvent>((resolve) => {
        worker.addEventListener('message', resolve, { once: true });
      });

      worker.postMessage({ type: 'start' });

      const event = await messagePromise;
      expect(event.data).toEqual({ type: 'started' });
    });

    it('should send heartbeat messages at regular intervals', async () => {
      worker.postMessage({ type: 'start' });

      await new Promise<void>((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'started') {
            resolve();
          }
        }, { once: true });
      });

      const heartbeats: MessageEvent[] = [];
      const heartbeatPromise = new Promise<void>((resolve) => {
        let count = 0;
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'heartbeat') {
            heartbeats.push(event);
            count++;
            if (count >= 2) {
              resolve();
            }
          }
        });
      });

      // Wait for at least 2 heartbeat messages (this will take ~20 seconds in real time)
      // For testing, we'll use a shorter timeout and verify the structure
      await Promise.race([
        heartbeatPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for heartbeats')), 25000))
      ]);

      expect(heartbeats.length).toBeGreaterThanOrEqual(2);
      heartbeats.forEach(event => {
        expect(event.data).toEqual({ type: 'heartbeat' });
      });
    }, 30000); // 30 second timeout for this test

    it('should stop heartbeat and send confirmation', async () => {
      worker.postMessage({ type: 'start' });
      
      await new Promise<void>((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'started') {
            resolve();
          }
        }, { once: true });
      });

      const stopPromise = new Promise<MessageEvent>((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'stopped') {
            resolve(event);
          }
        }, { once: true });
      });

      worker.postMessage({ type: 'stop' });

      const event = await stopPromise;
      expect(event.data).toEqual({ type: 'stopped' });
    });

    it('should handle unknown message types gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      worker.postMessage({ type: 'unknown' });

      // Give the worker time to process the message
      await new Promise(resolve => setTimeout(resolve, 100));

      // Note: We can't directly verify console.warn was called in the worker context
      // but we can verify the worker doesn't crash or send unexpected messages
      
      const messagePromise = new Promise<MessageEvent>((resolve) => {
        worker.addEventListener('message', resolve, { once: true });
      });

      worker.postMessage({ type: 'start' });
      const event = await messagePromise;
      expect(event.data).toEqual({ type: 'started' });

      consoleSpy.mockRestore();
    });
  });

  describe('Heartbeat Interval Management', () => {
    it('should handle restart without issues', async () => {
      worker.postMessage({ type: 'start' });
      
      await new Promise<void>((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'started') {
            resolve();
          }
        }, { once: true });
      });

      // Start again (should clear previous interval)
      const secondStartPromise = new Promise<MessageEvent>((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.type === 'started') {
            resolve(event);
          }
        }, { once: true });
      });

      worker.postMessage({ type: 'start' });
      const event = await secondStartPromise;
      expect(event.data).toEqual({ type: 'started' });
    });

    it('should stop cleanly even when no heartbeat is running', async () => {
      const stopPromise = new Promise<MessageEvent>((resolve) => {
        worker.addEventListener('message', resolve, { once: true });
      });

      // Stop without starting first
      worker.postMessage({ type: 'stop' });

      const event = await stopPromise;
      expect(event.data).toEqual({ type: 'stopped' });
    });
  });

  describe('Message Flow', () => {
    it('should handle complete start-heartbeat-stop cycle', async () => {
      const messages: any[] = [];
      
      worker.addEventListener('message', (event) => {
        messages.push(event.data);
      });

      worker.postMessage({ type: 'start' });
      
      await new Promise<void>((resolve) => {
        const checkMessages = () => {
          if (messages.some(msg => msg.type === 'started')) {
            resolve();
          } else {
            setTimeout(checkMessages, 10);
          }
        };
        checkMessages();
      });

      await new Promise<void>((resolve) => {
        const checkMessages = () => {
          if (messages.some(msg => msg.type === 'heartbeat')) {
            resolve();
          } else {
            setTimeout(checkMessages, 100);
          }
        };
        checkMessages();
      });

      worker.postMessage({ type: 'stop' });
      
      await new Promise<void>((resolve) => {
        const checkMessages = () => {
          if (messages.some(msg => msg.type === 'stopped')) {
            resolve();
          } else {
            setTimeout(checkMessages, 10);
          }
        };
        checkMessages();
      });

      // Verify we got all expected message types
      expect(messages.some(msg => msg.type === 'started')).toBe(true);
      expect(messages.some(msg => msg.type === 'heartbeat')).toBe(true);
      expect(messages.some(msg => msg.type === 'stopped')).toBe(true);
    }, 15000); // 15 second timeout

    it('should use correct heartbeat interval timing', async () => {
      const heartbeatTimes: number[] = [];
      
      worker.addEventListener('message', (event) => {
        if (event.data.type === 'heartbeat') {
          heartbeatTimes.push(Date.now());
        }
      });

      worker.postMessage({ type: 'start' });

      await new Promise<void>((resolve) => {
        const checkHeartbeats = () => {
          if (heartbeatTimes.length >= 2) {
            resolve();
          } else {
            setTimeout(checkHeartbeats, 100);
          }
        };
        checkHeartbeats();
      });

      // Verify the interval is approximately 10 seconds (allow some tolerance)
      const interval = heartbeatTimes[1] - heartbeatTimes[0];
      expect(interval).toBeGreaterThan(9500); // 9.5 seconds minimum
      expect(interval).toBeLessThan(10500);   // 10.5 seconds maximum
    }, 25000); // 25 second timeout
  });
}); 
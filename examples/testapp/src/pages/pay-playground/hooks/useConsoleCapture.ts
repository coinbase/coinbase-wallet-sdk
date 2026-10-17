import { useCallback } from 'react';
import { safeStringify } from '../utils/codeTransform';

export const useConsoleCapture = () => {
  const captureConsole = useCallback((onLog: (message: string) => void) => {
    const originalLog = console.log;
    const originalError = console.error;

    const formatArgs = (args: unknown[]) => {
      return args
        .map((arg) => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              return safeStringify(arg);
            } catch (_e) {
              return '[Object with circular reference]';
            }
          }
          return String(arg);
        })
        .join(' ');
    };

    console.log = (...args) => {
      onLog(formatArgs(args));
      originalLog(...args);
    };

    console.error = (...args) => {
      onLog(`ERROR: ${formatArgs(args)}`);
      originalError(...args);
    };

    // Return cleanup function
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return { captureConsole };
};

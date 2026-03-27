import { store } from ':store/store.js';
import { TELEMETRY_SCRIPT_CONTENT } from './telemetry-content.js';

export const loadTelemetryScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.ClientAnalytics) {
      return resolve();
    }

    try {
      const script = document.createElement('script');
      script.textContent = TELEMETRY_SCRIPT_CONTENT;
      script.type = 'text/javascript';
      document.head.appendChild(script);

      initCCA();

      document.head.removeChild(script);
      resolve();
    } catch {
      console.error('Failed to execute inlined telemetry script');
      reject();
    }
  });
};

const initCCA = () => {
  if (typeof window !== 'undefined') {
    const deviceId = store.config.get().deviceId ?? window.crypto?.randomUUID() ?? '';

    if (window.ClientAnalytics) {
      const { init, identify, PlatformName } = window.ClientAnalytics;

      init({
        isProd: true,
        amplitudeApiKey: 'c66737ad47ec354ced777935b0af822e',
        platform: PlatformName.web,
        projectName: 'base_account_sdk',
        showDebugLogging: false,
        version: '1.0.0',
        apiEndpoint: 'https://cca-lite.coinbase.com',
      });

      identify({ deviceId });
      store.config.set({ deviceId });
    }
  }
};

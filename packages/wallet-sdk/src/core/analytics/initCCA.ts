import { store } from ':store/store.js';
import { ANALYTICS_SCRIPT_CONTENT } from './analytics-content.js';

export const loadAnalyticsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.ClientAnalytics) {
      return resolve();
    }

    try {
      const script = document.createElement('script');
      script.textContent = ANALYTICS_SCRIPT_CONTENT;
      script.type = 'text/javascript';
      document.head.appendChild(script);

      initCCA();

      document.head.removeChild(script);
      resolve();
    } catch {
      console.error('Failed to execute inlined analytics script');
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

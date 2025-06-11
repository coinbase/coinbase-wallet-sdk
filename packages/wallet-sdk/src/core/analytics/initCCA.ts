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

      initCCA({ isDevelopment: false });

      document.head.removeChild(script);
      resolve();
    } catch {
      console.error('Failed to execute inlined analytics script');
      reject();
    }
  });
};

const initCCA = ({
  isDevelopment,
}: {
  isDevelopment: boolean;
}) => {
  if (typeof window !== 'undefined') {
    // TODO: to cache deviceId in cookies
    const deviceId = window.crypto?.randomUUID();

    if (window.ClientAnalytics) {
      const { init, identify, PlatformName } = window.ClientAnalytics;

      init({
        isProd: !isDevelopment,
        amplitudeApiKey: isDevelopment
          ? '3087329ad5383dcba74b9be7da3f829d'
          : 'c66737ad47ec354ced777935b0af822e',
        platform: PlatformName.web,
        projectName: 'base_account_sdk',
        showDebugLogging: isDevelopment,
        version: '1.0.0',
        apiEndpoint: 'https://cca-lite.coinbase.com',
      });

      identify({ deviceId: deviceId });
    }
  }
};

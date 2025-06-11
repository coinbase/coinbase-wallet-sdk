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

      document.head.removeChild(script);
      resolve();
    } catch {
      reject(new Error('Failed to execute inlined analytics script'));
    }
  });
};

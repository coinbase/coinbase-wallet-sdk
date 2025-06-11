interface ClientAnalyticsOptions {
  amplitudeApiKey: string;
  projectName: string;
  version?: string;
  isProd?: boolean;
  showDebugLogging?: boolean;
  trackUserId?: boolean;
  // ... more options
}

interface ClientAnalyticsStatic {
  init(options: ClientAnalyticsOptions): void;
  logEvent(eventName: string, data?: Record<string, any>, importance?: 'low' | 'high'): void;
  identify(userData: { userId: string; [key: string]: any }): void;
  markStep(stepName: string): void;
  incrementUjNavigation(): void;
  startPerfMark(label: string): void;
  endPerfMark(label: string): void;
  // ... more functions
}

declare global {
  interface Window {
    ClientAnalytics?: ClientAnalyticsStatic;
  }
}

export {};

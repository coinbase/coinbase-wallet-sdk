// File: vendor-js/client-analytics/ca.d.ts

// --- Enum-like Objects for Constants ---

/**
 * Static constants for different platform names.
 * @example ClientAnalytics.init({ platform: ClientAnalytics.PlatformName.web })
 */
interface PlatformNameEnum {
  readonly unknown: 'unknown';
  readonly web: 'web';
  readonly android: 'android';
  readonly ios: 'ios';
  readonly mobile_web: 'mobile_web';
  readonly tablet_web: 'tablet_web';
  readonly server: 'server';
  readonly windows: 'windows';
  readonly macos: 'macos';
  readonly extension: 'extension';
}

/**
 * Static constants for event action types.
 * @example ClientAnalytics.logEvent('...', { action: ClientAnalytics.ActionType.click, ... })
 */
interface ActionTypeEnum {
  readonly unknown: 'unknown';
  readonly blur: 'blur';
  readonly click: 'click';
  readonly change: 'change';
  readonly dismiss: 'dismiss';
  readonly focus: 'focus';
  readonly hover: 'hover';
  readonly select: 'select';
  readonly measurement: 'measurement';
  readonly move: 'move';
  readonly process: 'process';
  readonly render: 'render';
  readonly scroll: 'scroll';
  readonly view: 'view';
  readonly search: 'search';
  readonly keyPress: 'keyPress';
  readonly error: 'error';
}

/**
 * Static constants for component types.
 * @example ClientAnalytics.logEvent('...', { componentType: ClientAnalytics.ComponentType.button, ... })
 */
interface ComponentTypeEnum {
  readonly unknown: 'unknown';
  readonly banner: 'banner';
  readonly button: 'button';
  readonly card: 'card';
  readonly chart: 'chart';
  readonly content_script: 'content_script';
  readonly dropdown: 'dropdown';
  readonly link: 'link';
  readonly page: 'page';
  readonly modal: 'modal';
  readonly table: 'table';
  readonly search_bar: 'search_bar';
  readonly service_worker: 'service_worker';
  readonly text: 'text';
  readonly text_input: 'text_input';
  readonly tray: 'tray';
  readonly checkbox: 'checkbox';
  readonly icon: 'icon';
}

// --- Interfaces for State and Configuration ---

/**
 * Describes the read-only configuration object.
 */
interface ClientAnalyticsConfig {
  readonly amplitudeApiKey: string;
  readonly projectName: string;
  readonly version?: string | null;
  readonly isProd: boolean;
  readonly isInternalApplication: boolean;
  readonly platform: PlatformNameEnum[keyof PlatformNameEnum];
  readonly apiEndpoint: string;
  readonly showDebugLogging: boolean;
  readonly trackUserId: boolean;
}

/**
 * Describes the read-only user identity object.
 */
interface ClientAnalyticsIdentity {
  readonly userId?: string | null;
  readonly deviceId?: string | null;
  readonly countryCode?: string | null;
  readonly languageCode?: string | null;
  readonly locale?: string | null;
  readonly isOptOut: boolean;
  readonly jwt?: string | null;
}

/**
 * Describes the read-only device and browser information.
 */
interface ClientAnalyticsDevice {
  readonly browserName?: string | null;
  readonly browserMajor?: string | null;
  readonly osName?: string | null;
  readonly userAgent?: string | null;
  readonly width?: number | null;
  readonly height?: number | null;
}

/**
 * Describes the read-only page location information.
 */
interface ClientAnalyticsLocation {
  readonly pageKey: string;
  readonly pagePath: string;
  readonly prevPageKey: string;
  readonly prevPagePath: string;
}

/**
 * Describes the read-only persistent session data.
 */
interface ClientAnalyticsPersistentData {
  readonly eventId: number;
  readonly sequenceNumber: number;
  readonly sessionId: number;
  readonly lastEventTime: number;
  readonly sessionStart: number;
  readonly sessionUUID?: string | null;
  readonly userId?: string | null;
}

/**
 * Describes the configuration object for the ClientAnalytics.init() method.
 */
interface ClientAnalyticsOptions {
  amplitudeApiKey: string;
  projectName: string;
  version?: string | null;
  isProd?: boolean;
  isInternalApplication?: boolean;
  platform?: PlatformNameEnum[keyof PlatformNameEnum];
  apiEndpoint?: string;
  showDebugLogging?: boolean;
  trackUserId?: boolean;
}

/**
 * Describes the user data object for the ClientAnalytics.identify() method.
 */
interface ClientAnalyticsIdentityData {
  userId?: string | null;
  userTypeEnum?: number;
  countryCode?: string;
  languageCode?: string;
  locale?: string;
  [key: string]: any; // Allows for other custom user properties
}

/**
 * Describes the data for a custom event logged with ClientAnalytics.logEvent().
 */
interface ClientAnalyticsEventData {
  action: ActionTypeEnum[keyof ActionTypeEnum];
  componentType: ComponentTypeEnum[keyof ComponentTypeEnum];
  componentName?: string;
  loggingId?: string;
  [key: string]: any; // Allows for other custom event properties
}

/**
 * Describes the full API surface of the static ClientAnalytics object, including methods and read-only properties.
 */
interface ClientAnalyticsStatic {
  // --- Methods ---

  init(options: ClientAnalyticsOptions): void;
  logEvent(eventName: string, data: ClientAnalyticsEventData, importance?: 'low' | 'high'): void;
  identify(userData: ClientAnalyticsIdentityData): void;
  logPageView(options?: { callMarkNTBT?: boolean }): void;
  initTrackPageview(config: {
    browserHistory: { listen: (listener: () => void) => void };
    pageKeyRegex?: Record<string, RegExp>;
    blacklistRegex?: RegExp[];
  }): void;
  initNextJsTrackPageview(config: {
    nextJsRouter: { events: { on: (event: 'routeChangeComplete', listener: () => void) => void } };
    pageKeyRegex?: Record<string, RegExp>;
    blacklistRegex?: RegExp[];
  }): void;
  markStep(stepName: string): void;
  markStepOnce(stepName: string): void;
  incrementUjNavigation(): void;
  startPerfMark(label: string): void;
  endPerfMark(label: string): void;
  markNTBT(): void;
  identifyFlow(flowData: Record<string, any>): void;
  removeFromIdentifyFlow(keys: string[]): void;
  optOut(): void;
  optIn(): void;
  flushQueue(): Promise<void>;

  // --- Getters & Getter-style Methods ---

  getAnalyticsHeaders(): Record<string, string>;
  getReferrerData(): { referrer?: string; referring_domain?: string };
  getUserContext(): Record<string, any>;
  getTracingId(): string;
  getTracingHeaders(): Record<string, string>;

  // --- Read-only Properties (State & Constants) ---

  readonly config: ClientAnalyticsConfig;
  readonly identity: ClientAnalyticsIdentity;
  readonly device: ClientAnalyticsDevice;
  readonly location: ClientAnalyticsLocation;
  readonly persistentData: ClientAnalyticsPersistentData;

  // --- Static Enum-like Objects ---

  readonly PlatformName: PlatformNameEnum;
  readonly ActionType: ActionTypeEnum;
  readonly ComponentType: ComponentTypeEnum;
}

// --- Global Declaration ---

declare global {
  interface Window {
    ClientAnalytics?: ClientAnalyticsStatic;
  }
}

// This empty export makes the file a "module", which is necessary for 'declare global' to work correctly.
export {};

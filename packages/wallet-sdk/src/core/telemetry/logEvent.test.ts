import { store } from ':store/store.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActionType,
  AnalyticsEventImportance,
  type CCAEventData,
  ComponentType,
  identify,
  logEvent,
} from './logEvent.js';

vi.mock(':store/store.js');
vi.mock(':core/constants.js', () => ({
  PACKAGE_NAME: 'test-sdk',
  PACKAGE_VERSION: '1.0.0',
}));

const mockStore = store as any;

type TestEventData = Pick<CCAEventData, 'action' | 'componentType' | 'method'>;

describe('logEvent', () => {
  let mockClientAnalytics: any;
  let originalLocation: Location;

  beforeEach(() => {
    mockClientAnalytics = {
      logEvent: vi.fn(),
      identify: vi.fn(),
    };
    (window as any).ClientAnalytics = mockClientAnalytics;

    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      origin: 'https://example.com',
    };

    mockStore.config = {
      get: vi.fn().mockReturnValue({
        metadata: {
          appName: 'Test App',
        },
      }),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
    delete (window as any).ClientAnalytics;
  });

  describe('logEvent function', () => {
    it('should call ClientAnalytics.logEvent with correct parameters when ClientAnalytics exists', () => {
      const eventName = 'test_event';
      const eventData: TestEventData = {
        action: ActionType.click,
        componentType: ComponentType.button,
        method: 'test_method',
      };
      const importance = AnalyticsEventImportance.high;

      logEvent(eventName, eventData as CCAEventData, importance);

      expect(mockClientAnalytics.logEvent).toHaveBeenCalledWith(
        eventName,
        {
          ...eventData,
          sdkVersion: '1.0.0',
          sdkName: 'test-sdk',
          appName: 'Test App',
          appOrigin: 'https://example.com',
        },
        importance
      );
    });

    it('should auto fill metadata', () => {
      mockStore.config.get.mockReturnValue({});

      const eventName = 'test_event';
      const eventData: TestEventData = {
        action: ActionType.view,
        componentType: ComponentType.page,
      };

      logEvent(eventName, eventData as CCAEventData, undefined);

      expect(mockClientAnalytics.logEvent).toHaveBeenCalledWith(
        eventName,
        {
          ...eventData,
          sdkVersion: '1.0.0',
          sdkName: 'test-sdk',
          appName: '',
          appOrigin: 'https://example.com',
        },
        undefined
      );
    });

    it('should not call ClientAnalytics.logEvent when ClientAnalytics does not exist', () => {
      delete (window as any).ClientAnalytics;

      const eventName = 'test_event';
      const eventData: TestEventData = {
        action: ActionType.click,
        componentType: ComponentType.button,
      };

      logEvent(eventName, eventData as CCAEventData, AnalyticsEventImportance.high);

      expect(mockClientAnalytics.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('identify function', () => {
    it('should call ClientAnalytics.identify when ClientAnalytics exists', () => {
      const eventData: TestEventData = {
        action: ActionType.click,
        componentType: ComponentType.button,
        method: 'test_method',
      };

      identify(eventData as CCAEventData);

      expect(mockClientAnalytics.identify).toHaveBeenCalledWith(eventData);
    });

    it('should not call ClientAnalytics.identify when ClientAnalytics does not exist', () => {
      delete (window as any).ClientAnalytics;

      const eventData: TestEventData = {
        action: ActionType.click,
        componentType: ComponentType.button,
      };

      identify(eventData as CCAEventData);

      expect(mockClientAnalytics.identify).not.toHaveBeenCalled();
    });
  });
});

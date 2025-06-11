enum ComponentType {
  unknown = 'unknown',
  banner = 'banner',
  button = 'button',
  card = 'card',
  chart = 'chart',
  content_script = 'content_script',
  dropdown = 'dropdown',
  link = 'link',
  page = 'page',
  modal = 'modal',
  table = 'table',
  search_bar = 'search_bar',
  service_worker = 'service_worker',
  text = 'text',
  text_input = 'text_input',
  tray = 'tray',
  checkbox = 'checkbox',
  icon = 'icon',
}

enum ActionType {
  unknown = 'unknown',
  blur = 'blur',
  click = 'click',
  change = 'change',
  dismiss = 'dismiss',
  focus = 'focus',
  hover = 'hover',
  select = 'select',
  measurement = 'measurement',
  move = 'move',
  process = 'process',
  render = 'render',
  scroll = 'scroll',
  view = 'view',
  search = 'search',
  keyPress = 'keyPress',
  error = 'error',
}

enum AnalyticsEventImportance {
  low = 'low',
  high = 'high',
}

type CCAEventData = {
  // Standard Attributes
  action: ActionType;
  componentType: ComponentType;
  // Custom Attributes
  method?: string; // RPC method
};

type AnalyticsEventData = {
  name: string;
  event: CCAEventData;
  importance: AnalyticsEventImportance;
};

type LogEvent = (
  eventName: string,
  eventData: CCAEventData,
  importance?: AnalyticsEventImportance
) => void;

export function logEvent(
  name: string,
  event: CCAEventData,
  importance: AnalyticsEventImportance | undefined
) {
  if (window.ClientAnalytics) {
    window.ClientAnalytics?.logEvent(name, event, importance);
  }
}

export function identify(event: CCAEventData) {
  if (window.ClientAnalytics) {
    window.ClientAnalytics?.identify(event);
  }
}

export { ActionType, AnalyticsEventImportance, ComponentType };
export type { AnalyticsEventData, CCAEventData, LogEvent };

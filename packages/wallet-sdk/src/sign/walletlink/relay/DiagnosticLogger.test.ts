import { DiagnosticLogger, EVENTS, EventType, LogProperties } from './DiagnosticLogger';

describe('DiagnosticLogger', () => {
  describe('log', () => {
    let event: string;
    let props: LogProperties | undefined;

    class diagnosticLogger implements DiagnosticLogger {
      log(eventType: EventType, Properties?: LogProperties) {
        event = eventType;
        props = Properties;
      }
    }
    const diagnostic = new diagnosticLogger();
    test('calls the log function', () => {
      const logProperties = {
        message: 'a message',
        value: 'a value',
      };
      diagnostic.log(EVENTS.CONNECTED_STATE_CHANGE, logProperties);

      expect(event).toEqual(EVENTS.CONNECTED_STATE_CHANGE);
      expect(props).toEqual(logProperties);
    });
  });
});

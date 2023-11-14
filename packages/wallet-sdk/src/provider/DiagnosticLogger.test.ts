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
      diagnostic.log(EVENTS.CONNECTED, logProperties);

      expect(event).toEqual(EVENTS.CONNECTED);
      expect(props).toEqual(logProperties);
    });
  });
});

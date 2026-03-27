import { ServerMessage } from '../type/ServerMessage.js';

export class WalletLinkHTTP {
  private readonly auth: string;

  constructor(
    private readonly linkAPIUrl: string,
    private readonly sessionId: string,
    sessionKey: string
  ) {
    const credentials = `${sessionId}:${sessionKey}`;
    this.auth = `Basic ${btoa(credentials)}`;
  }

  // mark unseen events as seen
  private async markUnseenEventsAsSeen(events: ServerMessage<'Event'>[]) {
    return Promise.all(
      events.map((e) =>
        fetch(`${this.linkAPIUrl}/events/${e.eventId}/seen`, {
          method: 'POST',
          headers: {
            Authorization: this.auth,
          },
        })
      )
    ).catch((error) => console.error('Unable to mark events as seen:', error));
  }

  async fetchUnseenEvents(): Promise<ServerMessage<'Event'>[]> {
    const response = await fetch(`${this.linkAPIUrl}/events?unseen=true`, {
      headers: {
        Authorization: this.auth,
      },
    });

    if (response.ok) {
      const { events, error } = (await response.json()) as {
        events?: {
          id: string;
          event: 'Web3Request' | 'Web3Response' | 'Web3RequestCanceled';
          data: string;
        }[];
        timestamp: number;
        error?: string;
      };

      if (error) {
        throw new Error(`Check unseen events failed: ${error}`);
      }

      const responseEvents: ServerMessage<'Event'>[] =
        events
          ?.filter((e) => e.event === 'Web3Response')
          .map((e) => ({
            type: 'Event',
            sessionId: this.sessionId,
            eventId: e.id,
            event: e.event,
            data: e.data,
          })) ?? [];

      this.markUnseenEventsAsSeen(responseEvents);

      return responseEvents;
    }
    throw new Error(`Check unseen events failed: ${response.status}`);
  }
}

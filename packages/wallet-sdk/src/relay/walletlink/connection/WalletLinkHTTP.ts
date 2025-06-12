import { ServerMessage } from '../type/ServerMessage';

export class WalletLinkHTTP {
  private readonly auth: string;

  constructor(
    private readonly linkAPIUrl: string,
    private readonly sessionId: string,
    sessionKey: string
  ) {
    const credentials = `${sessionId}:${sessionKey}`;
    this.auth = `Basic ${btoa(credentials)}`;
    console.debug('[WalletLinkHTTP] Initialized with URL:', linkAPIUrl, 'SessionId:', sessionId);
  }

  // mark unseen events as seen
  private async markUnseenEventsAsSeen(events: ServerMessage<'Event'>[]) {
    console.debug('[WalletLinkHTTP] Marking', events.length, 'events as seen');
    return Promise.all(
      events.map((e) => {
        const url = `${this.linkAPIUrl}/events/${e.eventId}/seen`;
        console.debug('[WalletLinkHTTP] Marking event as seen:', e.eventId, 'URL:', url);
        return fetch(url, {
          method: 'POST',
          headers: {
            Authorization: this.auth,
          },
        }).catch((error) => {
          console.error(`[WalletLinkHTTP] Failed to mark event ${e.eventId} as seen:`, error);
          // Don't throw, just log - marking as seen is not critical
        });
      })
    ).catch((error) => {
      console.error('[WalletLinkHTTP] Failed to mark events as seen:', error);
    });
  }

  async fetchUnseenEvents(): Promise<ServerMessage<'Event'>[]> {
    const url = `${this.linkAPIUrl}/events?unseen=true`;
    console.debug('[WalletLinkHTTP] Fetching unseen events from:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.auth,
        },
      });

      console.debug('[WalletLinkHTTP] Unseen events response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.debug('[WalletLinkHTTP] Unseen events response data:', responseData);
        
        const { events, error } = responseData as {
          events?: {
            id: string;
            event: 'Web3Request' | 'Web3Response' | 'Web3RequestCanceled';
            data: string;
          }[];
          timestamp: number;
          error?: string;
        };

        if (error) {
          console.error('[WalletLinkHTTP] Server returned error:', error);
          throw new Error(`Check unseen events failed: ${error}`);
        }

        const responseEvents: ServerMessage<'Event'>[] =
          events
            ?.filter((e) => {
              const isWeb3Response = e.event === 'Web3Response';
              console.debug('[WalletLinkHTTP] Event:', e.id, 'Type:', e.event, 'Is Web3Response:', isWeb3Response);
              return isWeb3Response;
            })
            .map((e) => ({
              type: 'Event',
              sessionId: this.sessionId,
              eventId: e.id,
              event: e.event,
              data: e.data,
            })) ?? [];

        console.debug('[WalletLinkHTTP] Filtered to', responseEvents.length, 'Web3Response events');
        
        if (responseEvents.length > 0) {
          this.markUnseenEventsAsSeen(responseEvents);
        }

        return responseEvents;
      }
      console.error('[WalletLinkHTTP] Failed to fetch unseen events, status:', response.status);
      throw new Error(`Check unseen events failed: ${response.status}`);
    } catch (error) {
      // Add more context to network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[WalletLinkHTTP] Network error fetching unseen events - possible CORS issue or network failure');
        throw new Error('Network error: Unable to reach WalletLink server. This may be due to CORS restrictions or network connectivity issues.');
      }
      console.error('[WalletLinkHTTP] Error fetching unseen events:', error);
      throw error;
    }
  }
}

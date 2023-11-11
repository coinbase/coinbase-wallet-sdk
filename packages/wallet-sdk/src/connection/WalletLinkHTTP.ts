class WalletLinkHTTP {
  async fetchUnseenEventsAPI() {
    const credentials = `${this.sessionId}:${this.sessionKey}`;
    const auth = `Basic ${btoa(credentials)}`;

    const response = await fetch(`${this.linkAPIUrl}/events?unseen=true`, {
      headers: {
        Authorization: auth,
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

      const responseEvents: ServerMessageEvent[] =
        events
          ?.filter((e) => e.event === 'Web3Response')
          .map((e) => ({
            type: 'Event',
            sessionId: this.sessionId,
            eventId: e.id,
            event: e.event,
            data: e.data,
          })) ?? [];
      responseEvents.forEach((e) => this.handleIncomingEvent(e));

      this.markUnseenEventsAsSeen(responseEvents);
    } else {
      throw new Error(`Check unseen events failed: ${response.status}`);
    }
  }
}

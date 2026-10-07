const COOP_QUERY_KEY = 'coop';
const COOP_QUERY_VALUE = 'same-origin';
const COOP_HEADER = 'Cross-Origin-Opener-Policy';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    url.searchParams.get(COOP_QUERY_KEY) !== COOP_QUERY_VALUE
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const response = await fetch(event.request);
      const headers = new Headers(response.headers);
      headers.set(COOP_HEADER, COOP_QUERY_VALUE);
      headers.delete('content-encoding');
      headers.delete('content-length');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })()
  );
});

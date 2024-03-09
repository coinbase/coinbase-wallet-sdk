export function createQrUrl(
  sessionId: string,
  sessionSecret: string,
  serverUrl: string,
  isParentConnection: boolean,
  version: string,
  chainId: number
): string {
  const sessionIdKey = isParentConnection ? 'parent-id' : 'id';

  const query = new URLSearchParams({
    [sessionIdKey]: sessionId,
    secret: sessionSecret,
    server: serverUrl,
    v: version,
    chainId: chainId.toString(),
  }).toString();

  const qrUrl = `${serverUrl}/#/link?${query}`;

  return qrUrl;
}

function isInIFrame(): boolean {
  try {
    return window.frameElement !== null;
  } catch (e) {
    return false;
  }
}

export function getLocation(): Location {
  try {
    if (isInIFrame() && window.top) {
      return window.top.location;
    }
    return window.location;
  } catch (e) {
    return window.location;
  }
}

export function isMobileWeb(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window?.navigator?.userAgent
  );
}

export function isDarkMode(): boolean {
  return window?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

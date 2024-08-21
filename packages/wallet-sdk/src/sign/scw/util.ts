import { RequestArguments } from ':core/provider/interface';

export function isPresigned(request: RequestArguments): boolean {
  if (request.method !== 'wallet_sendCalls') {
    throw new Error('Invalid method for isPresigned()');
  }

  const { params } = request;

  return Boolean(
    params &&
      typeof params === 'object' &&
      'capabilities' in params &&
      typeof params.capabilities === 'object' &&
      params.capabilities &&
      'presigned' in params.capabilities &&
      params.capabilities.presigned
  );
}

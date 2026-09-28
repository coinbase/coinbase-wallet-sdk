import { RpcRequestInput } from './RpcRequestInput';

const baseRequestInfo: RpcRequestInput = {
  method: 'experimental_requestInfo',
  params: [
    {
      key: 'requests',
      required: true,
    },
  ],
  format: (data: Record<string, string>) => [
    {
      requests: data.requests,
    },
  ],
};

export const experimentalMethods = [baseRequestInfo];

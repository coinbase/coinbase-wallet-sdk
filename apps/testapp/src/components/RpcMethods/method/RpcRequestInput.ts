import { JSONRPCMethod } from '@coinbase/wallet-sdk/dist/provider/JSONRPC';

type FormattedParamsType = Record<string, unknown> | string;

export type RpcRequestInput = {
  connected?: boolean;
  method: JSONRPCMethod;
  params: Array<{ key: string; required?: boolean }>;
  format?: (data: Record<string, string>) => FormattedParamsType[];
};

import { JSONRPCMethod } from '@coinbase/wallet-sdk/dist/provider/JSONRPC';

type FormattedParamsType = Record<string, unknown> | string;

type methodType = `${JSONRPCMethod}`;

export type RpcRequestInput = {
  connected?: boolean;
  method: methodType;
  params: Array<{ key: string; required?: boolean }>;
  format?: (data: Record<string, string>) => FormattedParamsType[];
};

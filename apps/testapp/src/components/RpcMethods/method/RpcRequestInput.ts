type FormattedParamsType = Record<string, unknown> | string;

export type RpcRequestInput = {
  method: string;
  params: Array<{ key: string; required?: boolean }>;
  format?: (data: Record<string, string>) => FormattedParamsType[];
};

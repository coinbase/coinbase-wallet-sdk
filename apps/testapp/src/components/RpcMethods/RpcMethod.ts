type FormattedParamsType = Record<string, unknown> | string;

type ShortcutType = {
  key: string;
  data: Record<string, string>;
};

export type RpcMethod = {
  connected?: boolean;
  method: string;
  params: Array<{ key: string; required?: boolean }>;
  format?: (data: Record<string, string>) => FormattedParamsType[];
  shortcuts?: ShortcutType[];
};

export type Chain = {
  id: number;
  rpcUrl?: string;
  nativeCurrency?: {
    symbol?: string;
    decimal?: number;
    name?: string;
  };
};

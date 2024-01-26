export type RequestAccountsAction = {
  method: 'eth_requestAccounts';
  params: Record<string, never>; // empty object
};

export type PersonalSignAction = {
  method: 'personal_sign';
  params: {
    address: string;
    message: string;
  };
};

export type SignTypedDataV3Action = {
  method: 'eth_signTypedData_v3';
  params: {
    address: string;
    typedDataJson: string;
  };
};

export type SignTypedDataV4Action = {
  method: 'eth_signTypedData_v4';
  params: {
    address: string;
    typedDataJson: string;
  };
};

export type SignTransactionAction = {
  method: 'eth_signTransaction';
  params: {
    fromAddress: string;
    toAddress: string | null;
    weiValue: string;
    data: string;
    nonce: number;
    gasPriceInWei: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
    gasLimit: string | null;
    chainId: string;
  };
};

export type SendTransactionAction = {
  method: 'eth_sendTransaction';
  params: {
    fromAddress: string;
    toAddress: string | null;
    weiValue: string;
    data: string;
    nonce: number;
    gasPriceInWei: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
    gasLimit: string | null;
    chainId: string;
  };
};

export type AllAction =
  | RequestAccountsAction
  | PersonalSignAction
  | SignTypedDataV3Action
  | SignTypedDataV4Action
  | SignTransactionAction
  | SendTransactionAction;

export type SupportedEthereumMethodsType = AllAction['method'];

// export type ActionType<M extends SupportedEthereumMethodsType> = Extract<AllAction, { method: M }>;

export type Action = {
  method: SupportedEthereumMethodsType;
  params: unknown; // json encoded params
};

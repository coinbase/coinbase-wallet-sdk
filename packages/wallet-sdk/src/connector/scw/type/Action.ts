export enum SupportedEthereumMethods {
  EthRequestAccounts = 'eth_requestAccounts',
  EthSendTransaction = 'eth_sendTransaction',
  PersonalSign = 'personal_sign',
  EthSign = 'eth_sign',
  EthSignTypedDataV3 = 'eth_signTypedData_v3',
  EthSignTypedDataV4 = 'eth_signTypedData_v4',
}

export type RequestAccountsAction = {
  method: SupportedEthereumMethods.EthRequestAccounts;
  params: Record<string, never>; // empty object
};

export type PersonalSignAction = {
  method: SupportedEthereumMethods.PersonalSign;
  params: {
    address: string;
    message: string;
  };
};

export type SignTypedDataV3Action = {
  method: SupportedEthereumMethods.EthSignTypedDataV3;
  params: {
    address: string;
    typedDataJson: string;
  };
};

export type SignTypedDataV4Action = {
  method: SupportedEthereumMethods.EthSignTypedDataV4;
  params: {
    address: string;
    typedDataJson: string;
  };
};

export type SignTransactionAction = {
  method: SupportedEthereumMethods.EthSign;
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
  method: SupportedEthereumMethods.EthSendTransaction;
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

export type Action = {
  method: SupportedEthereumMethods;
  params: unknown; // json encoded params
};

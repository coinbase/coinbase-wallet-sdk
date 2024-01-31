export enum SupportedEthereumMethods {
  EthRequestAccounts = 'eth_requestAccounts',
  // Sign Transaction
  EthSendTransaction = 'eth_sendTransaction',
  EthSignTransaction = 'eth_signTransaction',
  EthSendRawTransaction = 'eth_sendRawTransaction',
  // Sign Message
  EthSign = 'eth_sign',
  PersonalSign = 'personal_sign',
  EthSignTypedDataV1 = 'eth_signTypedData_v1',
  EthSignTypedDataV3 = 'eth_signTypedData_v3',
  EthSignTypedDataV4 = 'eth_signTypedData_v4',
}

export type RequestAccountsAction = {
  method: SupportedEthereumMethods.EthRequestAccounts;
  params: Record<string, never>; // empty object
};

export type SignAction = {
  method: SupportedEthereumMethods.EthSign;
  params: {
    address: string;
    message: string;
  };
};

export type PersonalSignAction = {
  method: SupportedEthereumMethods.PersonalSign;
  params: {
    address: string;
    message: string;
  };
};

export type SignTypedDataV1Action = {
  method: SupportedEthereumMethods.EthSignTypedDataV1;
  params: {
    address: string;
    typedDataJson: string;
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
  method: SupportedEthereumMethods.EthSignTransaction;
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

export type SendRawTransactionAction = {
  method: SupportedEthereumMethods.EthSendRawTransaction;
  params: {
    transaction: string;
  };
};

export type AllAction =
  | RequestAccountsAction
  | SignAction
  | PersonalSignAction
  | SignTypedDataV1Action
  | SignTypedDataV3Action
  | SignTypedDataV4Action
  | SignTransactionAction
  | SendTransactionAction
  | SendRawTransactionAction;

export type Action = {
  method: SupportedEthereumMethods;
  params: unknown; // json encoded params
};

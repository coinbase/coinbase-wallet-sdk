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
  // Wallet
  WalletSwitchEthereumChain = 'wallet_switchEthereumChain',
  WalletAddEthereumChain = 'wallet_addEthereumChain',
  WalletGetCapacities = 'wallet_getCapabilities',
  WalletSendTransaction = 'wallet_sendTransaction',
  WalletGetTransactionStatus = 'wallet_getTransactionStatus',
  WalletShowTransactionStatus = 'wallet_showTransactionStatus',
}

export type RequestAccountsAction = {
  method: SupportedEthereumMethods.EthRequestAccounts;
  params: {
    dappName: string;
    dappLogoUrl: string | null;
    dappOrigin?: string;
    chainIds?: number[];
  };
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
    message: string;
  };
};

export type SignTypedDataV3Action = {
  method: SupportedEthereumMethods.EthSignTypedDataV3;
  params: {
    address: string;
    message: string;
  };
};

export type SignTypedDataV4Action = {
  method: SupportedEthereumMethods.EthSignTypedDataV4;
  params: {
    address: string;
    message: string;
  };
};

export type SignTransactionAction = {
  method: SupportedEthereumMethods.EthSignTransaction;
  params: {
    from: string;
    to: string | null;
    value: string;
    data: string;
    nonce: number;
    gasPriceInWei: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
    gasLimit: string | null;
  };
};

export type SendTransactionAction = {
  method: SupportedEthereumMethods.EthSendTransaction;
  params: {
    from: string;
    to: string | null;
    value: string;
    data: string;
    nonce: number;
    gasPriceInWei: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
    gasLimit: string | null;
  };
};

export type SendRawTransactionAction = {
  method: SupportedEthereumMethods.EthSendRawTransaction;
  params: {
    transaction: string;
  };
};

export type SwitchEthereumChainAction = {
  method: SupportedEthereumMethods.WalletSwitchEthereumChain;
  params: [
    {
      chainId: string;
    },
  ];
};

export type AddEthereumChainAction = {
  method: SupportedEthereumMethods.WalletAddEthereumChain;
  params: {
    chainId: string;
    blockExplorerUrls?: string[];
    chainName?: string;
    iconUrls?: string[];
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls?: string[];
  };
};

export type GetCapacitiesAction = {
  method: SupportedEthereumMethods.WalletGetCapacities;
  params: null;
};

export type WalletSendTransactionAction = {
  method: SupportedEthereumMethods.WalletSendTransaction;
  params: {
    chainId: number;
    sender: string;
    calls: {
      target: string;
      value: string;
      data: string;
      gas: string;
    }[];
    capabilities: object;
  };
};

export type ShowTransactionStatusAction = {
  method: SupportedEthereumMethods.WalletShowTransactionStatus;
  params: [string];
};

export type GetTransactionStatusAction = {
  method: SupportedEthereumMethods.WalletGetTransactionStatus;
  params: [string];
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
  | SendRawTransactionAction
  | SwitchEthereumChainAction
  | AddEthereumChainAction
  | GetCapacitiesAction
  | WalletSendTransactionAction
  | ShowTransactionStatusAction
  | GetTransactionStatusAction;

export type Action = {
  method: SupportedEthereumMethods;
  params: unknown; // json encoded params
};

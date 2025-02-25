import { SerializedEthereumRpcError } from ':core/error/utils.js';
import { SubAccountInfo } from ':stores/sub-accounts/store.js';

export type SignInWithEthereumCapabilityRequest = {
  nonce: string;
  chainId: string; // EIP-155 hex-encoded
  version?: string;
  scheme?: string;
  domain?: string;
  uri?: string;
  statement?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
};

export type SignInWithEthereumCapabilityResponse = {
  message: string;
  signature: `0x${string}`;
};

export type SpendPermissionsCapabilityRequest = {
  token: `0x${string}`;
  allowance: string;
  period: number;
  salt?: `0x${string}`;
  extraData?: `0x${string}`;
};

export type SpendPermissionsCapabilityResponse = {
  signature: `0x${string}`;
};

export type AddSubAccountResponse = {
  address?: `0x${string}`;
  factory?: `0x${string}`;
  factoryData?: `0x${string}`;
};

export type AddAddressCapabilityResponse = SubAccountInfo;

export type WalletConnectRequest = {
  method: 'wallet_connect';
  params: [
    {
      // JSON-RPC method version.
      version: string;
      // Optional capabilities to request (e.g. Sign In With Ethereum).
      capabilities?: {
        addSubAccount?: AddSubAccountResponse;
        getSubAccounts?: AddSubAccountResponse;
        spendPermissions?: SpendPermissionsCapabilityRequest;
        signInWithEthereum?: SignInWithEthereumCapabilityRequest;
      };
    },
  ];
};

export type WalletConnectResponse = {
  accounts: {
    // Address of the connected account.
    address: `0x${string}`;
    // Capabilities granted that is associated with this account.
    capabilities?: {
      addSubAccount?: AddAddressCapabilityResponse | SerializedEthereumRpcError;
      getSubAccounts?: AddAddressCapabilityResponse[];
      spendPermissions?: SpendPermissionsCapabilityResponse | SerializedEthereumRpcError;
      signInWithEthereum?: SignInWithEthereumCapabilityResponse | SerializedEthereumRpcError;
    };
  }[];
};

import { SerializedEthereumRpcError } from ':core/error/utils.js';
import { SpendPermissionConfig } from ':core/provider/interface.js';
import { SpendPermission } from './coinbase_fetchSpendPermissions.js';
import { AddSubAccountAccount } from './wallet_addSubAccount.js';

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

export type SpendPermissionsCapabilityRequest = Record<number, SpendPermissionConfig[]>;

export type AddSubAccountCapabilityRequest = {
  account: AddSubAccountAccount;
};

export type AddSubAccountCapabilityResponse = {
  address?: `0x${string}`;
  factory?: `0x${string}`;
  factoryData?: `0x${string}`;
};

export type SpendPermissionsCapabilityResponse = {
  permissions: SpendPermission[];
};

export type WalletConnectRequest = {
  method: 'wallet_connect';
  params: [
    {
      // JSON-RPC method version.
      version: string;
      // Optional capabilities to request (e.g. Sign In With Ethereum).
      capabilities?: {
        addSubAccount?: AddSubAccountCapabilityRequest;
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
      subAccounts?: AddSubAccountCapabilityResponse[] | SerializedEthereumRpcError;
      spendPermissions?: SpendPermissionsCapabilityResponse | SerializedEthereumRpcError;
      signInWithEthereum?: SignInWithEthereumCapabilityResponse | SerializedEthereumRpcError;
    };
  }[];
};

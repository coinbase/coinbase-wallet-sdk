import { RegExpString, IntNumber, AddressString } from "../types"
import {
  ScanQRCodeResponse,
  ArbitraryResponse,
  Web3Response,
  ChildRequestEthereumAccountsResponse,
  RequestEthereumAccountsResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  SignEthereumMessageResponse,
  EthereumAddressFromSignedMessageResponse
} from "./Web3Response"
import { Web3Request } from "./Web3Request"
import { EthereumTransactionParams } from "./EthereumTransactionParams"

export const WALLET_USER_NAME_KEY = "walletUsername"

export abstract class WalletLinkRelayAbstract {
  abstract resetAndReload(): void
  abstract childRequestEthereumAccounts(
    childSessionId: string,
    childSessionSecret: string,
    dappName: string,
    dappLogoURL: string,
    dappURL: string
  ): Promise<ChildRequestEthereumAccountsResponse>
  abstract requestEthereumAccounts(): Promise<RequestEthereumAccountsResponse>

  abstract signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): Promise<SignEthereumMessageResponse>

  abstract ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ): Promise<EthereumAddressFromSignedMessageResponse>

  abstract signEthereumTransaction(
    params: EthereumTransactionParams
  ): Promise<SignEthereumTransactionResponse>

  abstract signAndSubmitEthereumTransaction(
    params: EthereumTransactionParams
  ): Promise<SubmitEthereumTransactionResponse>

  abstract submitEthereumTransaction(
    signedTransaction: Buffer,
    chainId: IntNumber
  ): Promise<SubmitEthereumTransactionResponse>

  abstract scanQRCode(regExp: RegExpString): Promise<ScanQRCodeResponse>
  abstract arbitraryRequest(data: string): Promise<ArbitraryResponse>
  abstract sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T
  ): Promise<U>

  abstract setAppInfo(appName: string, appLogoUrl: string | null): void
  abstract setChainIdCallback(chainIdCallback: (chainId: string) => void): void
  abstract setJsonRpcUrlCallback(jsonRpcUrlCallback: (jsonRpcUrl: string) => void): void
}

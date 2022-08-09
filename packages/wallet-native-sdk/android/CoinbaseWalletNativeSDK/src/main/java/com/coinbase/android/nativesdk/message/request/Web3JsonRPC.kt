package com.coinbase.android.nativesdk.message.request

import com.coinbase.android.nativesdk.message.JSON
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString

private typealias BigInt = String

const val WEB3_JSON_RPC_ETH_REQUEST_ACCOUNTS = "eth_requestAccounts"
const val WEB3_JSON_RPC_PERSONAL_SIGN = "personal_sign"
const val WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V3 = "eth_signTypedData_v3"
const val WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4"
const val WEB3_JSON_RPC_ETH_SIGN_TRANSACTION = "eth_signTransaction"
const val WEB3_JSON_RPC_ETH_SEND_TRANSACTION = "eth_sendTransaction"
const val WEB3_JSON_RPC_WALLET_SWITCH_ETHEREUM_CHAIN = "wallet_switchEthereumChain"
const val WEB3_JSON_RPC_WALLET_ADD_ETHEREUM_CHAIN = "wallet_addEthereumChain"
const val WEB3_JSON_RPC_WALLET_WATCH_ASSET = "wallet_watchAsset"

val nonHandshakeActions = listOf(WEB3_JSON_RPC_ETH_SEND_TRANSACTION, WEB3_JSON_RPC_ETH_SIGN_TRANSACTION)

@Suppress("unused")
@Serializable
sealed class Web3JsonRPC {

    @Serializable
    @SerialName(WEB3_JSON_RPC_ETH_REQUEST_ACCOUNTS)
    class RequestAccounts : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_PERSONAL_SIGN)
    class PersonalSign(
        val address: String,
        val message: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V3)
    class SignTypedDataV3(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V4)
    class SignTypedDataV4(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_ETH_SIGN_TRANSACTION)
    class SignTransaction(
        val fromAddress: String,
        val toAddress: String?,
        val weiValue: BigInt,
        val data: String,
        val nonce: Int?,
        val gasPriceInWei: BigInt?,
        val maxFeePerGas: BigInt?,
        val maxPriorityFeePerGas: BigInt?,
        val gasLimit: BigInt?,
        val chainId: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_ETH_SEND_TRANSACTION)
    class SendTransaction(
        val fromAddress: String,
        val toAddress: String?,
        val weiValue: BigInt,
        val data: String,
        val nonce: Int?,
        val gasPriceInWei: BigInt?,
        val maxFeePerGas: BigInt?,
        val maxPriorityFeePerGas: BigInt?,
        val gasLimit: BigInt?,
        val chainId: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_WALLET_SWITCH_ETHEREUM_CHAIN)
    class SwitchEthereumChain(val chainId: String) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_WALLET_ADD_ETHEREUM_CHAIN)
    class AddEthereumChain(
        val chainId: String,
        val blockExplorerUrls: List<String>? = null,
        val chainName: String? = null,
        val iconUrls: List<String>? = null,
        val nativeCurrency: AddChainNativeCurrency? = null,
        val rpcUrls: List<String> = emptyList()
    ) : Web3JsonRPC()

    @Serializable
    @SerialName(WEB3_JSON_RPC_WALLET_WATCH_ASSET)
    class WatchAsset(
        val type: String,
        val options: WatchAssetOptions
    ) : Web3JsonRPC()

    internal val asJson: Pair<String, String>
        get() {
            val json = JSON.encodeToString(this)
            val method = when (this) {
                is RequestAccounts -> WEB3_JSON_RPC_ETH_REQUEST_ACCOUNTS
                is SendTransaction -> WEB3_JSON_RPC_ETH_SEND_TRANSACTION
                is SignTransaction -> WEB3_JSON_RPC_ETH_SIGN_TRANSACTION
                is PersonalSign -> WEB3_JSON_RPC_PERSONAL_SIGN
                is SignTypedDataV3 -> WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V3
                is SignTypedDataV4 -> WEB3_JSON_RPC_ETH_SIGN_TYPED_DATA_V4
                is AddEthereumChain -> WEB3_JSON_RPC_WALLET_ADD_ETHEREUM_CHAIN
                is SwitchEthereumChain -> WEB3_JSON_RPC_WALLET_SWITCH_ETHEREUM_CHAIN
                is WatchAsset -> WEB3_JSON_RPC_WALLET_WATCH_ASSET
            }

            return method to json
        }

    fun action(optional: Boolean = false): Action = Action(rpc = this, optional = optional)
}

@Serializable
class AddChainNativeCurrency(val name: String, val symbol: String, val decimals: Int)

@Serializable
class WatchAssetOptions(val address: String, val symbol: String?, val decimals: Int?, val image: String?)

package com.coinbase.android.nativesdk.message.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private typealias BigInt = String

@Serializable
sealed class Web3JsonRPC {

    @Serializable
    @SerialName("eth_requestAccounts")
    class RequestAccounts : Web3JsonRPC()

    @Serializable
    @SerialName("personal_sign")
    class PersonalSign(
        val address: String,
        val message: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("eth_signTypedData_v3")
    class SignTypedDataV3(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("eth_signTypedData_v4")
    class SignTypedDataV4(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("eth_signTransaction")
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
        val chainId: Int
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("eth_sendTransaction")
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
        val chainId: Int
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("wallet_switchEthereumChain")
    class SwitchEthereumChain(val chainId: Int) : Web3JsonRPC()

    @Serializable
    @SerialName("wallet_addEthereumChain")
    class AddEthereumChain(
        val chainId: Int,
        val blockExplorerUrls: List<String>?,
        val chainName: String?,
        val iconUrls: List<String>?,
        val nativeCurrency: AddChainNativeCurrency?,
        val rpcUrls: List<String>
    ) : Web3JsonRPC()

    @Serializable
    @SerialName("wallet_watchAsset")
    class WatchAsset(
        val type: String,
        val options: WatchAssetOptions
    ) : Web3JsonRPC()

    internal val asJson: Pair<String, String>
        get() {
            val json = Json.encodeToString(this)
            val method = when (this) {
                is RequestAccounts -> "eth_requestAccounts"
                is SendTransaction -> "eth_sendTransaction"
                is SignTransaction -> "eth_signTransaction"
                is PersonalSign -> "personal_sign"
                is SignTypedDataV3 -> "eth_signTypedData_v3"
                is SignTypedDataV4 -> "eth_signTypedData_v4"
                is AddEthereumChain -> "wallet_addEthereumChain"
                is SwitchEthereumChain -> "wallet_switchEthereumChain"
                is WatchAsset -> "wallet_watchAsset"
            }

            return Pair(method, json)
        }

    fun action(optional: Boolean = false): Action {
        return Action(rpc = this, optional = optional)
    }
}

@Serializable
class AddChainNativeCurrency(val name: String, val symbol: String, val decimals: Int)

@Serializable
class WatchAssetOptions(val address: String, val symbol: String?, val decimals: Int?, val image: String?)

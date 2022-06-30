package com.coinbase.android.nativesdk.message.request

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private typealias BigInt = String

@Serializable
sealed class Web3JsonRPC {

    @Serializable
    object eth_requestAccounts : Web3JsonRPC()

    @Serializable
    class personal_sign(
        val address: String,
        val message: String
    ) : Web3JsonRPC()

    @Serializable
    class eth_signTypedData_v3(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    class eth_signTypedData_v4(
        val address: String,
        val typedDataJson: String
    ) : Web3JsonRPC()

    @Serializable
    class eth_signTransaction(
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
    class eth_sendTransaction(
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
    class wallet_switchEthereumChain(val chainId: Int) : Web3JsonRPC()

    @Serializable
    class wallet_addEthereumChain(
        val chainId: Int,
        val blockExplorerUrls: List<String>?,
        val chainName: String?,
        val iconUrls: List<String>?,
        val nativeCurrency: AddChainNativeCurrency?,
        val rpcUrls: List<String>
    ) : Web3JsonRPC()

    @Serializable
    class wallet_watchAsset(
        val type: String,
        val options: WatchAssetOptions
    ) : Web3JsonRPC()

    val asJson: Pair<String, String>
        get() {
            val json = Json.encodeToString(this)
            val method = when (this) {
                is eth_requestAccounts -> "eth_requestAccounts"
                is eth_sendTransaction -> "eth_sendTransaction"
                is eth_signTransaction -> "eth_signTransaction"
                is personal_sign -> "personal_sign"
                is eth_signTypedData_v3 -> "eth_signTypedData_v3"
                is eth_signTypedData_v4 -> "eth_signTypedData_v4"
                is wallet_addEthereumChain -> "wallet_addEthereumChain"
                is wallet_switchEthereumChain -> "wallet_switchEthereumChain"
                is wallet_watchAsset -> "wallet_watchAsset"
            }

            return Pair(method, json)
        }
}

@Serializable
class AddChainNativeCurrency(val name: String, val symbol: String, val decimals: Int)

@Serializable
class WatchAssetOptions(val address: String, val symbol: String?, val decimals: Int?, val image: String?)

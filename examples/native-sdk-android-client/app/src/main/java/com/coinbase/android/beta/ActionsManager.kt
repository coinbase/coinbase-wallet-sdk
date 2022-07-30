package com.coinbase.android.beta

import android.content.Context
import android.content.SharedPreferences
import com.coinbase.android.nativesdk.message.request.Web3JsonRPC

object ActionsManager {

    private val requestAccount = Web3JsonRPC.RequestAccounts().action()

    private val personalSign = Web3JsonRPC.PersonalSign(
        "0xabcdefabcdefabcdefabcdefabcdefabcdef",
        "Hello world"
    ).action()

    private val switchEthereumChain = Web3JsonRPC.SwitchEthereumChain("137").action()

    val addEthereumChain = Web3JsonRPC.AddEthereumChain("172222").action()

    private fun getSignTransaction(fromAddress: String, toAddress: String) = Web3JsonRPC.SignTransaction(
        fromAddress = fromAddress,
        toAddress = toAddress,
        weiValue = "10000000000000",
        data = "0x",
        nonce = null,
        gasPriceInWei = null,
        maxFeePerGas = null,
        maxPriorityFeePerGas = null,
        gasLimit = "1000",
        chainId = "1",
    ).action()

    private fun getSendTransaction(fromAddress: String, toAddress: String) = Web3JsonRPC.SendTransaction(
        fromAddress = fromAddress,
        toAddress = toAddress,
        weiValue = "10000000000000",
        data = "0x",
        nonce = null,
        gasPriceInWei = null,
        maxFeePerGas = null,
        maxPriorityFeePerGas = null,
        gasLimit = "1000",
        chainId = "1",
    ).action()

    val signTypedDataV3 = Web3JsonRPC.SignTypedDataV3("0xabcdefabcdefabcdefabcdefabcdefabcdef", "").action()

    val handShakeActions = listOf(requestAccount, personalSign)

    fun getRequestActions(
        fromAddress: String = SharedPrefsManager.account,
        toAddress: String
    ) = listOf(
        requestAccount,
        personalSign,
        switchEthereumChain,
        getSendTransaction(fromAddress, toAddress)
    )
}

object SharedPrefsManager {
    lateinit var sharedPrefs: SharedPreferences

    var account: String
        get() = sharedPrefs.getString("eth_account", "") ?: ""
        set(value) {
            with(sharedPrefs.edit()) {
                putString("eth_account", value)
                apply()
            }
        }

    fun init(context: Context) {
        sharedPrefs = context.getSharedPreferences("DEMO_APP", Context.MODE_PRIVATE)
    }

    fun removeAccount() {
        with(sharedPrefs.edit()) {
            remove("eth_account")
            apply()
        }
    }
}

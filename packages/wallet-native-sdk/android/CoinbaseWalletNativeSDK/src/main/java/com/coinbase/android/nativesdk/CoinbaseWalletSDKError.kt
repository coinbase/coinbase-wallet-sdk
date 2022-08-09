package com.coinbase.android.nativesdk

sealed class CoinbaseWalletSDKError(errorMessage: String? = null) : Exception(errorMessage) {
    object EncodingFailed : CoinbaseWalletSDKError("Encoding failed")
    object DecodingFailed : CoinbaseWalletSDKError("Decoding failed")
    object MissingSharedSecret : CoinbaseWalletSDKError("Missing shared secret")
    object OpenWalletFailed : CoinbaseWalletSDKError("Could not open wallet")
    object InvalidHandshakeRequest : CoinbaseWalletSDKError("Could not process this request in handshake")
    class WalletReturnedError(error: String) : CoinbaseWalletSDKError(error)
}
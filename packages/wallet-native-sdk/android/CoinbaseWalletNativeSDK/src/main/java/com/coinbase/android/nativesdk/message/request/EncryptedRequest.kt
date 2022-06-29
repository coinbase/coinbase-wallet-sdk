package com.coinbase.android.nativesdk.message.request

import kotlinx.serialization.Serializable

@Serializable
internal class EncryptedRequest(val data: String)
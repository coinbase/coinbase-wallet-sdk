package com.coinbase.android.nativesdk.message.response

import kotlinx.serialization.Serializable

@Serializable
sealed class ReturnValue {
    @Serializable
    class Result(val value: String) : ReturnValue()

    @Serializable
    class Error(val code: Long, val message: String) : ReturnValue()
}
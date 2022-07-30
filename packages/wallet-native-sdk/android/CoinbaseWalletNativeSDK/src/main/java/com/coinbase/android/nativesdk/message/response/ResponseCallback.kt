package com.coinbase.android.nativesdk.message.response

typealias SuccessResponseCallback = ResponseCallback<List<ReturnValue>>
typealias FailureResponseCallback = ResponseCallback<Throwable>

interface ResponseCallback<T> {
    fun call(result: T)
}

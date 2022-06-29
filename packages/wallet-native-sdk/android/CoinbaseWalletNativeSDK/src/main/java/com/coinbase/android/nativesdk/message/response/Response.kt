package com.coinbase.android.nativesdk.message.response

import com.coinbase.android.nativesdk.message.Message
import kotlinx.serialization.Serializable

typealias ResponseResult = Result<List<ReturnValue>>
typealias ResponseHandler = (ResponseResult) -> Unit
typealias ResponseMessage = Message<ResponseContent>

@Serializable
sealed class ResponseContent {
    @Serializable
    class Response(
        val requestId: String,
        val values: List<ReturnValue>
    ) : ResponseContent()

    @Serializable
    class Failure(
        val requestId: String,
        val description: String
    ) : ResponseContent()
}

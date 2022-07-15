package com.coinbase.android.nativesdk.message.response

import com.coinbase.android.nativesdk.message.Message
import com.coinbase.android.nativesdk.message.MessageSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

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

object ResponseMessages {
    fun decodeFromJson(json: JsonElement): ResponseMessage {
        val responseSerializer = ResponseSerializer(encrypted = false)
        val serializer = MessageSerializer(responseSerializer)
        return Json.decodeFromJsonElement(serializer, json)
    }

    fun decodeFromJson(json: String): ResponseMessage {
        val responseSerializer = ResponseSerializer(encrypted = false)
        val serializer = MessageSerializer(responseSerializer)
        return Json.decodeFromString(serializer, json)
    }
}
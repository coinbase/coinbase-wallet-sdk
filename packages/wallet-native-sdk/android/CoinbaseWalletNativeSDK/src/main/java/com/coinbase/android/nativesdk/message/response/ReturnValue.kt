package com.coinbase.android.nativesdk.message.response

import com.coinbase.android.nativesdk.CoinbaseWalletSDKError
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject

@Serializable(with = ReturnValueSerializer::class)
sealed class ReturnValue {
    @Serializable
    class Result(val value: String) : ReturnValue()

    @Serializable
    class Error(val code: Long, val message: String) : ReturnValue()
}

internal object ReturnValueSerializer : KSerializer<ReturnValue> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("ReturnValue")

    override fun serialize(encoder: Encoder, value: ReturnValue) {
        val output = encoder as? JsonEncoder ?: throw CoinbaseWalletSDKError.EncodingFailed
        val formatter = output.json

        val json = buildJsonObject {
            when (value) {
                is ReturnValue.Result -> put("result", formatter.encodeToJsonElement(value))
                is ReturnValue.Error -> put("error", formatter.encodeToJsonElement(value))
            }
        }

        output.encodeJsonElement(json)
    }

    override fun deserialize(decoder: Decoder): ReturnValue {
        val input = decoder as? JsonDecoder ?: throw CoinbaseWalletSDKError.DecodingFailed
        val formatter = input.json
        val json = input.decodeJsonElement().jsonObject

        return when (val key = json.keys.firstOrNull()) {
            "result" -> formatter.decodeFromJsonElement<ReturnValue.Result>(json.getValue(key))
            "error" -> formatter.decodeFromJsonElement<ReturnValue.Error>(json.getValue(key))
            else -> throw CoinbaseWalletSDKError.DecodingFailed
        }
    }
}
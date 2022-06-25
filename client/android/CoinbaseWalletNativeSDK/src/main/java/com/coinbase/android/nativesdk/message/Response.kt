package com.coinbase.android.nativesdk.message

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encodeToString
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

typealias ResponseResult = Result<Response.Response>
typealias ResponseHandler = (ResponseResult) -> Unit

@Serializable
sealed interface Response {
    @Serializable
    class Response(val requestUUID: String, val results: List<String>) :
        com.coinbase.android.nativesdk.message.Response

    @Serializable
    class Error(val requestUUID: String, val value: String) : com.coinbase.android.nativesdk.message.Response
}

internal class ResponseContentSerializer(private val sharedSecret: ByteArray?) : KSerializer<Response> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("ResponseContent", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Response) {
        val json = when (value) {
            is Response.Error -> buildJsonObject {
                put("error", Json.encodeToString(value))
            }
            is Response.Response -> buildJsonObject {
                val encrypted = Cipher.encrypt(
                    secret = requireNotNull(sharedSecret),
                    message = Json.encodeToString(value)
                )
                put("response", encrypted)
            }
        }

        encoder.encodeString(json.toString())
    }

    override fun deserialize(decoder: Decoder): Response {
        val json = (decoder as JsonDecoder).decodeJsonElement().jsonObject

        return when (val key = json.keys.firstOrNull()) {
            "error" -> {
                val jsonString = requireNotNull(json[key]?.jsonPrimitive?.content)
                Json.decodeFromString<Response.Error>(jsonString)
            }
            "response" -> {
                val encoded = requireNotNull(json[key]?.jsonPrimitive?.content)
                val decryptedJsonString = Cipher.decrypt(
                    secret = requireNotNull(sharedSecret),
                    encryptedMessage = encoded
                )
                Json.decodeFromString<Response.Response>(decryptedJsonString)
            }
            else -> throw Error("Unsupported response type: $key")
        }
    }
}
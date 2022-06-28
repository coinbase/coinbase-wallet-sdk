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

@Serializable
sealed interface Request {
    @Serializable
    class Handshake(
        val callback: String,
        val initialActions: List<Action>? = null
    ) : com.coinbase.android.nativesdk.message.Request

    @Serializable
    class Request(
        val actions: List<Action>,
        val account: Account? = null
    ) : com.coinbase.android.nativesdk.message.Request
}

@Serializable
class Action(
    val method: String,
    val params: List<String>,
    val optional: Boolean? = false
)

internal class RequestContentSerializer(private val sharedSecret: ByteArray?) : KSerializer<Request> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("RequestContent", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Request) {
        val json = when (value) {
            is Request.Handshake -> buildJsonObject {
                put("handshake", Json.encodeToString(value))
            }
            is Request.Request -> buildJsonObject {
                val encrypted = Cipher.encrypt(
                    secret = requireNotNull(sharedSecret),
                    message = Json.encodeToString(value)
                )
                put("request", encrypted)
            }
        }

        encoder.encodeString(json.toString())
    }

    override fun deserialize(decoder: Decoder): Request {
        val json = (decoder as JsonDecoder).decodeJsonElement().jsonObject

        return when (val key = json.keys.firstOrNull()) {
            "handshake" -> {
                val jsonString = requireNotNull(json[key]?.jsonPrimitive?.content)
                Json.decodeFromString<Request.Handshake>(jsonString)
            }
            "request" -> {
                val encoded = requireNotNull(json[key]?.jsonPrimitive?.content)
                val decryptedJsonString = Cipher.decrypt(
                    secret = requireNotNull(sharedSecret),
                    encryptedMessage = encoded
                )
                Json.decodeFromString<Request.Request>(decryptedJsonString)
            }
            else -> throw Error("Unsupported request type: $key")
        }
    }
}
package com.coinbase.android.nativesdk.message

import com.coinbase.android.nativesdk.key.PublicKeySerializer
import kotlinx.serialization.Contextual
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.security.PublicKey

sealed interface Content {
    class RequestContent(val request: Request) : Content
    class ResponseContent(val response: Response) : Content
}

@Serializable
class Message(
    val uuid: String,
    val version: String,
    @Serializable(with = PublicKeySerializer::class)
    val sender: PublicKey,
    @Contextual
    val content: Content
)

internal class MessageContentSerializer(private val sharedSecret: ByteArray?) : KSerializer<Content> {

    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("MessageContent", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Content) {
        val jsonObject = when (value) {
            is Content.RequestContent -> buildJsonObject {
                val json = Json.encodeToJsonElement(RequestContentSerializer(sharedSecret), value.request)
                put("request", json)
            }
            is Content.ResponseContent -> buildJsonObject {
                val json = Json.encodeToJsonElement(ResponseContentSerializer(sharedSecret), value.response)
                put("response", json)
            }
        }

        encoder.encodeString(jsonObject.toString())
    }

    override fun deserialize(decoder: Decoder): Content {
        val json = Json.parseToJsonElement(decoder.decodeString()).jsonObject

        return when (val key = json.keys.firstOrNull()) {
            "request" -> {
                val jsonString = requireNotNull(json[key]?.jsonPrimitive?.content)
                val request = Json.decodeFromJsonElement(
                    RequestContentSerializer(sharedSecret),
                    Json.parseToJsonElement(jsonString)
                )
                Content.RequestContent(request)
            }
            "response" -> {
                val jsonString = requireNotNull(json[key]?.jsonPrimitive?.content)
                val response = Json.decodeFromJsonElement(
                    ResponseContentSerializer(sharedSecret),
                    Json.parseToJsonElement(jsonString)
                )
                Content.ResponseContent(response)
            }
            else -> throw Error("Unsupported message content: $key")
        }
    }
}
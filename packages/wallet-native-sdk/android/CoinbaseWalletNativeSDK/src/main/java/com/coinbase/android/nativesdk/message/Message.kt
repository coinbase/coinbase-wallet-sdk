package com.coinbase.android.nativesdk.message

import com.coinbase.android.nativesdk.CoinbaseWalletSDKError
import com.coinbase.android.nativesdk.key.PublicKeySerializer
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
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.security.PublicKey
import java.util.Date

@Serializable
class Message<Content>(
    val uuid: String,
    val version: String,
    @Serializable(with = PublicKeySerializer::class)
    val sender: PublicKey,
    val content: Content,
    @Serializable(with = DateSerializer::class)
    val timestamp: Date
)

class MessageSerializer<Content>(private val contentSerializer: KSerializer<Content>) : KSerializer<Message<Content>> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("RequestMessage")

    override fun serialize(encoder: Encoder, value: Message<Content>) {
        val output = encoder as? JsonEncoder ?: throw CoinbaseWalletSDKError.EncodingFailed
        val formatter = output.json

        val messageJson = buildJsonObject {
            put("uuid", value.uuid)
            put("version", value.version)
            put("sender", formatter.encodeToJsonElement(PublicKeySerializer, value.sender))
            put("content", formatter.encodeToJsonElement(contentSerializer, value.content))
            put("timestamp", formatter.encodeToJsonElement(DateSerializer, value.timestamp))
        }

        output.encodeJsonElement(messageJson)
    }

    override fun deserialize(decoder: Decoder): Message<Content> {
        val input = decoder as? JsonDecoder ?: throw CoinbaseWalletSDKError.DecodingFailed
        val json = input.decodeJsonElement().jsonObject
        val formatter = input.json

        return Message(
            uuid = formatter.decodeFromJsonElement(json.getValue("uuid")),
            version = formatter.decodeFromJsonElement(json.getValue("version")),
            sender = formatter.decodeFromJsonElement(PublicKeySerializer, json.getValue("sender")),
            content = formatter.decodeFromJsonElement(contentSerializer, json.getValue("content")),
            timestamp = formatter.decodeFromJsonElement(DateSerializer, json.getValue("timestamp"))
        )
    }
}

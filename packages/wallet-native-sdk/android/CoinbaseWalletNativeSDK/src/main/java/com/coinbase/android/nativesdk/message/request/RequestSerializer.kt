package com.coinbase.android.nativesdk.message.request

import com.coinbase.android.nativesdk.CoinbaseWalletSDKError
import com.coinbase.android.nativesdk.message.Cipher
import kotlinx.serialization.KSerializer
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encodeToString
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject

class RequestSerializer(
    private val sharedSecret: ByteArray?,
    private val encrypted: Boolean = true
) : KSerializer<RequestContent> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("RequestContent")

    override fun serialize(encoder: Encoder, value: RequestContent) {
        val output = encoder as? JsonEncoder ?: throw CoinbaseWalletSDKError.EncodingFailed
        val formatter = output.json

        val json = buildJsonObject {
            when (value) {
                is RequestContent.Handshake -> {
                    put("handshake", formatter.encodeToJsonElement(value))
                }
                is RequestContent.Request -> {
                    val request = if (encrypted) {
                        val encryptedData = Cipher.encrypt(
                            secret = sharedSecret ?: throw CoinbaseWalletSDKError.MissingSharedSecret,
                            message = formatter.encodeToString(value)
                        )
                        formatter.encodeToJsonElement(EncryptedRequest(encryptedData))
                    } else {
                        formatter.encodeToJsonElement(value)
                    }

                    put("request", request)
                }
            }

        }

        output.encodeJsonElement(json)
    }

    override fun deserialize(decoder: Decoder): RequestContent {
        val input = decoder as? JsonDecoder ?: throw CoinbaseWalletSDKError.DecodingFailed
        val json = input.decodeJsonElement().jsonObject
        val formatter = input.json

        return when (val key = json.keys.firstOrNull()) {
            "handshake" -> {
                formatter.decodeFromJsonElement<RequestContent.Handshake>(json.getValue(key))
            }
            "request" -> {
                if (encrypted) {
                    val encryptedRequest: EncryptedRequest = formatter.decodeFromJsonElement(json.getValue(key))
                    val requestJsonString = Cipher.decrypt(
                        secret = sharedSecret ?: throw CoinbaseWalletSDKError.MissingSharedSecret,
                        encryptedMessage = encryptedRequest.data
                    )
                    formatter.decodeFromString<RequestContent.Request>(requestJsonString)
                } else {
                    formatter.decodeFromJsonElement<RequestContent.Request>(json.getValue(key))
                }
            }
            else -> throw CoinbaseWalletSDKError.DecodingFailed
        }
    }
}
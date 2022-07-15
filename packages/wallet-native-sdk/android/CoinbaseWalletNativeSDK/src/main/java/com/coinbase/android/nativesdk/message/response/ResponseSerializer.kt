package com.coinbase.android.nativesdk.message.response

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

class ResponseSerializer(
    private val sharedSecret: ByteArray? = null,
    private val encrypted: Boolean = true
) : KSerializer<ResponseContent> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("ResponseContent")

    override fun serialize(encoder: Encoder, value: ResponseContent) {
        val output = encoder as? JsonEncoder ?: throw CoinbaseWalletSDKError.EncodingFailed
        val formatter = output.json

        val json = buildJsonObject {
            when (value) {
                is ResponseContent.Failure -> {
                    put("failure", formatter.encodeToJsonElement(value))
                }
                is ResponseContent.Response -> {
                    val response = if (encrypted) {
                        val encryptedData = Cipher.encrypt(
                            secret = sharedSecret ?: throw CoinbaseWalletSDKError.MissingSharedSecret,
                            message = formatter.encodeToString(value)
                        )
                        formatter.encodeToJsonElement(EncryptedResponse(encryptedData))
                    } else {
                        formatter.encodeToJsonElement(value)
                    }

                    put("response", response)
                }
            }
        }

        output.encodeJsonElement(json)
    }

    override fun deserialize(decoder: Decoder): ResponseContent {
        val input = decoder as? JsonDecoder ?: throw CoinbaseWalletSDKError.DecodingFailed
        val json = input.decodeJsonElement().jsonObject
        val formatter = input.json

        return when (val key = json.keys.firstOrNull()) {
            "failure" -> {
                formatter.decodeFromJsonElement<ResponseContent.Failure>(json.getValue(key))
            }
            "response" -> {
                if (encrypted) {
                    val encryptedResponse: EncryptedResponse = formatter.decodeFromJsonElement(json.getValue(key))
                    val responseJsonString = Cipher.decrypt(
                        secret = sharedSecret ?: throw CoinbaseWalletSDKError.MissingSharedSecret,
                        encryptedMessage = encryptedResponse.data
                    )
                    formatter.decodeFromString<ResponseContent.Response>(responseJsonString)
                } else {
                    formatter.decodeFromJsonElement<ResponseContent.Response>(json.getValue(key))
                }
            }
            else -> throw CoinbaseWalletSDKError.DecodingFailed
        }
    }
}
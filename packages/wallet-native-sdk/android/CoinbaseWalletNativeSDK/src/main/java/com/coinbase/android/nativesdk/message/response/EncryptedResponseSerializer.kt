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

class EncryptedResponseSerializer(private val sharedSecret: ByteArray?) : KSerializer<ResponseContent> {
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
                    val encryptedData = Cipher.encrypt(
                        secret = requireNotNull(sharedSecret),
                        message = formatter.encodeToString(value)
                    )
                    put("response", formatter.encodeToJsonElement(EncryptedResponse(encryptedData)))
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
                val encryptedResponse: EncryptedResponse = formatter.decodeFromJsonElement(json.getValue(key))
                val responseJsonString = Cipher.decrypt(
                    secret = requireNotNull(sharedSecret),
                    encryptedMessage = encryptedResponse.data
                )
                formatter.decodeFromString<ResponseContent.Response>(responseJsonString)
            }
            else -> throw CoinbaseWalletSDKError.DecodingFailed
        }
    }
}
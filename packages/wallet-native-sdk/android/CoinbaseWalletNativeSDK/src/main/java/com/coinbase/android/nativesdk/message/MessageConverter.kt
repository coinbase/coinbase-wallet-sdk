package com.coinbase.android.nativesdk.message

import android.net.Uri
import com.coinbase.android.nativesdk.key.PublicKeySerializer
import com.coinbase.android.nativesdk.message.request.RequestSerializer
import com.coinbase.android.nativesdk.message.request.RequestContent
import com.coinbase.android.nativesdk.message.request.RequestMessage
import com.coinbase.android.nativesdk.message.response.ResponseSerializer
import com.coinbase.android.nativesdk.message.response.ResponseContent
import com.coinbase.android.nativesdk.message.response.ResponseMessage
import com.google.crypto.tink.subtle.Base64
import com.google.crypto.tink.subtle.EllipticCurves
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey

object MessageConverter {

    fun encodeRequest(
        message: RequestMessage,
        recipient: Uri,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): Uri {
        val sharedSecret = getSharedSecret(ownPrivateKey, peerPublicKey)
        val encryptedSerializer = encryptedRequestSerializer(sharedSecret)
        val json = JSON.encodeToString(encryptedSerializer, message)

        return recipient.buildUpon()
            .appendQueryParameter("p", Base64.encode(json.toByteArray()))
            .build()
    }

    fun encodeResponse(
        message: ResponseMessage,
        recipient: Uri,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): Uri {
        val sharedSecret = getSharedSecret(ownPrivateKey, peerPublicKey)
        val encryptedSerializer = encryptedResponseSerializer(sharedSecret)
        val json = JSON.encodeToString(encryptedSerializer, message)

        return recipient.buildUpon()
            .appendQueryParameter("p", Base64.encode(json.toByteArray()))
            .build()
    }

    fun decodeRequest(
        url: Uri,
        ownPublicKey: ECPublicKey? = null,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): RequestMessage {
        val encodedMessage = requireNotNull(url.getQueryParameter("p"))
        val messageJsonString = String(Base64.decode(encodedMessage))
        val messageJson = JSON.parseToJsonElement(messageJsonString)
        val sharedSecret = getSharedSecret(messageJson, ownPublicKey, ownPrivateKey, peerPublicKey)

        val encryptedSerializer = encryptedRequestSerializer(sharedSecret)
        return JSON.decodeFromJsonElement(encryptedSerializer, messageJson)
    }

    fun decodeResponse(
        url: Uri,
        ownPublicKey: ECPublicKey? = null,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): ResponseMessage {
        val encodedMessage = requireNotNull(url.getQueryParameter("p"))
        val messageJsonString = String(Base64.decode(encodedMessage))
        val messageJson = JSON.parseToJsonElement(messageJsonString)
        val sharedSecret = getSharedSecret(messageJson, ownPublicKey, ownPrivateKey, peerPublicKey)

        val encryptedSerializer = encryptedResponseSerializer(sharedSecret)
        return JSON.decodeFromJsonElement(encryptedSerializer, messageJson)
    }

    private fun getSharedSecret(
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): ByteArray? {
        return if (ownPrivateKey != null && peerPublicKey != null) {
            EllipticCurves.computeSharedSecret(ownPrivateKey, peerPublicKey)
        } else {
            null
        }
    }

    private fun getSharedSecret(
        messageJson: JsonElement,
        ownPublicKey: ECPublicKey? = null,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): ByteArray? {
        if (ownPrivateKey == null) {
            return null
        }

        val otherPublicKey = if (peerPublicKey != null) {
            peerPublicKey
        } else {
            val senderJsonObject = messageJson.jsonObject["sender"] ?: return null
            JSON.decodeFromJsonElement(PublicKeySerializer, senderJsonObject) as ECPublicKey
        }

        if (otherPublicKey == ownPublicKey) {
            return null
        }

        return EllipticCurves.computeSharedSecret(ownPrivateKey, otherPublicKey)
    }

    private fun encryptedRequestSerializer(sharedSecret: ByteArray?): MessageSerializer<RequestContent> {
        val contentSerializer = RequestSerializer(sharedSecret)
        return MessageSerializer(contentSerializer)
    }

    private fun encryptedResponseSerializer(sharedSecret: ByteArray?): MessageSerializer<ResponseContent> {
        val contentSerializer = ResponseSerializer(sharedSecret)
        return MessageSerializer(contentSerializer)
    }
}

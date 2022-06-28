package com.coinbase.android.nativesdk.message

import android.net.Uri
import com.coinbase.android.nativesdk.key.PublicKeySerializer
import com.google.crypto.tink.subtle.Base64
import com.google.crypto.tink.subtle.EllipticCurves
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.modules.serializersModuleOf
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey

object MessageConverter {

    fun encode(
        message: Message,
        recipient: Uri,
        ownPrivateKey: ECPrivateKey? = null,
        peerPublicKey: ECPublicKey? = null
    ): Uri {
        val sharedSecret = if (ownPrivateKey != null && peerPublicKey != null) {
            EllipticCurves.computeSharedSecret(ownPrivateKey, peerPublicKey)
        } else {
            null
        }

        val formatter = getJsonFormatter(sharedSecret)
        val jsonString = formatter.encodeToString(message)

        return recipient.buildUpon()
            .appendQueryParameter("p", Base64.encode(jsonString.toByteArray()))
            .build()
    }

    fun decode(
        url: Uri,
        ownPublicKey: ECPublicKey?,
        ownPrivateKey: ECPrivateKey?,
        peerPublicKey: ECPublicKey?
    ): Message {
        val encodedMessage = requireNotNull(url.getQueryParameter("p"))
        val messageJsonString = String(Base64.decode(encodedMessage))
        val messageJson = Json.parseToJsonElement(messageJsonString)
        val sharedSecret = getSharedSecret(messageJson, ownPublicKey, ownPrivateKey, peerPublicKey)

        val formatter = getJsonFormatter(sharedSecret)
        return formatter.decodeFromJsonElement(messageJson)
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
            Json.decodeFromJsonElement(PublicKeySerializer, senderJsonObject) as ECPublicKey
        }

        if (otherPublicKey == ownPublicKey) {
            return null
        }

        return EllipticCurves.computeSharedSecret(ownPrivateKey, otherPublicKey)
    }

    private fun getJsonFormatter(sharedSecret: ByteArray?): Json {
        return Json {
            serializersModule = serializersModuleOf(MessageContentSerializer(sharedSecret))
        }
    }
}

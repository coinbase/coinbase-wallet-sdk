package com.coinbase.android.nativesdk.message

import com.google.crypto.tink.subtle.AesGcmJce
import com.google.crypto.tink.subtle.Base64

internal object Cipher {
    fun encrypt(secret: ByteArray, message: String): String {
        val associatedData = "encrypted data"
        val encrypted = AesGcmJce(secret).encrypt(message.toByteArray(), associatedData.toByteArray())
        return Base64.encode(encrypted)
    }

    fun decrypt(secret: ByteArray, encryptedMessage: String): String {
        val encryptedBytes = Base64.decode(encryptedMessage)
        val associatedData = "encrypted data"
        val decryptedBytes = AesGcmJce(secret).decrypt(encryptedBytes, associatedData.toByteArray())
        return String(decryptedBytes)
    }
}
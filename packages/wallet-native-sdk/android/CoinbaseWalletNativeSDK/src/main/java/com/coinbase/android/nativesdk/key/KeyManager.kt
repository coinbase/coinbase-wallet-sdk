package com.coinbase.android.nativesdk.key

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.google.crypto.tink.subtle.Base64
import com.google.crypto.tink.subtle.EllipticCurves
import java.security.KeyPair
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey

private const val PUBLIC_KEY_ALIAS = "public_key"
private const val PRIVATE_KEY_ALIAS = "private_key"
private const val PEER_PUBLIC_KEY_ALIAS = "peer_public_key"

internal class KeyManager(appContext: Context, host: String) {

    private val encryptedStore: SharedPreferences

    val ownPublicKey: ECPublicKey
        get() = getOrCreateKeyPair(alias = "own_key_pair").public as ECPublicKey

    val ownPrivateKey: ECPrivateKey
        get() = getOrCreateKeyPair(alias = "own_key_pair").private as ECPrivateKey

    val peerPublicKey: ECPublicKey?
        get() {
            val encoded = encryptedStore.getString(PEER_PUBLIC_KEY_ALIAS, null) ?: return null
            val publicKeyBytes = Base64.decode(encoded)
            return EllipticCurves.getEcPublicKey(publicKeyBytes)
        }

    init {
        // Create main key that secures encrypted storage
        val purposes = KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        val keyGenSpec = KeyGenParameterSpec.Builder("wallet_segue_main_key", purposes)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()

        val mainKey = MasterKeys.getOrCreate(keyGenSpec)

        encryptedStore = EncryptedSharedPreferences.create(
            "${host}_wallet_segue_key_store",
            mainKey,
            appContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun storePeerPublicKey(key: ECPublicKey) {
        val encoded = Base64.encode(key.encoded)
        encryptedStore.edit()
            .putString(PEER_PUBLIC_KEY_ALIAS, encoded)
            .commit()
    }

    private fun deleteKeyPair(alias: String) {
        val publicKeyAlias = "$alias-$PUBLIC_KEY_ALIAS"
        val privateKeyAlias = "$alias-$PRIVATE_KEY_ALIAS"

        encryptedStore.edit()
            .remove(publicKeyAlias)
            .remove(privateKeyAlias)
            .commit()
    }

    private fun getOrCreateKeyPair(alias: String): KeyPair {
        val publicKeyAlias = "$alias-$PUBLIC_KEY_ALIAS"
        val privateKeyAlias = "$alias-$PRIVATE_KEY_ALIAS"

        val publicKeyB64 = encryptedStore.getString(publicKeyAlias, null)
        val privateKeyB64 = encryptedStore.getString(privateKeyAlias, null)

        if (publicKeyB64 != null && privateKeyB64 != null) {
            // Already have keys in encrypted storage
            val publicKeyBytes = Base64.decode(publicKeyB64)
            val privateKeyBytes = Base64.decode(privateKeyB64)

            return KeyPair(
                EllipticCurves.getEcPublicKey(publicKeyBytes),
                EllipticCurves.getEcPrivateKey(privateKeyBytes)
            )
        } else {
            // Generate new key pair and save to encrypted storage
            val keyPair = EllipticCurves.generateKeyPair(EllipticCurves.CurveType.NIST_P256)

            encryptedStore
                .edit()
                .putString(publicKeyAlias, Base64.encode(keyPair.public.encoded))
                .putString(privateKeyAlias, Base64.encode(keyPair.private.encoded))
                .commit()

            return keyPair
        }
    }
}
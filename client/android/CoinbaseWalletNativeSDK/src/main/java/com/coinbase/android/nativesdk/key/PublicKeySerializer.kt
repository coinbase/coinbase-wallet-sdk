package com.coinbase.android.nativesdk.key

import com.google.crypto.tink.subtle.Base64
import com.google.crypto.tink.subtle.EllipticCurves
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import java.security.PublicKey

internal object PublicKeySerializer : KSerializer<PublicKey> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("PublicKey", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: PublicKey) = encoder.encodeString(Base64.encode(value.encoded))

    override fun deserialize(decoder: Decoder): PublicKey =
        EllipticCurves.getEcPublicKey(Base64.decode(decoder.decodeString()))
}
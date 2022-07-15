package com.coinbase.android.nativesdk.message

import kotlinx.serialization.json.Json

internal val JSON = Json {
    encodeDefaults = true
    classDiscriminator = "#wsegue_type"
}
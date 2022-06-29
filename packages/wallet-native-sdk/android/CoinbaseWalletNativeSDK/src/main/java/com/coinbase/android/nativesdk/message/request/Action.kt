package com.coinbase.android.nativesdk.message.request

import kotlinx.serialization.Serializable

@Serializable
class Action(
    val method: String,
    val params: List<String>,
    val optional: Boolean? = false
)
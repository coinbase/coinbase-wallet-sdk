package com.coinbase.android.nativesdk.message.request

import kotlinx.serialization.Serializable

@Serializable
class Action {
    val method: String
    private val paramsJson: String
    private val optional: Boolean

    constructor(method: String, paramsJson: String, optional: Boolean = false) {
        this.method = method
        this.paramsJson = paramsJson
        this.optional = optional
    }

    constructor(rpc: Web3JsonRPC, optional: Boolean = false) {
        val (method, paramsJson) = rpc.asJson
        this.method = method
        this.paramsJson = paramsJson
        this.optional = optional
    }
}
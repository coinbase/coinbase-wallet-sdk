package com.coinbase.android.nativesdk.message.request

import com.coinbase.android.nativesdk.message.Message
import kotlinx.serialization.Serializable

typealias RequestMessage = Message<RequestContent>

@Serializable
sealed class RequestContent {

    @Serializable
    class Handshake(
        val appId: String,
        val callback: String,
        val initialActions: List<Action>? = null
    ) : RequestContent()

    @Serializable
    class Request(
        val actions: List<Action>,
        val account: Account? = null
    ) : RequestContent()
}

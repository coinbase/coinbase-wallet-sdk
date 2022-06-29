package com.coinbase.android.nativesdk.task

import com.coinbase.android.nativesdk.message.request.RequestMessage
import com.coinbase.android.nativesdk.message.response.ResponseHandler
import java.util.Date

internal class Task(
    val request: RequestMessage,
    val handler: ResponseHandler,
    val timestamp: Date
)
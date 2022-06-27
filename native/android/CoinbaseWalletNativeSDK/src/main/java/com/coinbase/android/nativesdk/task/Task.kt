package com.coinbase.android.nativesdk.task

import com.coinbase.android.nativesdk.message.Message
import com.coinbase.android.nativesdk.message.ResponseHandler
import java.util.Date

internal class Task(
    val request: Message,
    val handler: ResponseHandler,
    val timestamp: Date
)
package com.coinbase.android.nativesdk.task

import com.coinbase.android.nativesdk.CoinbaseWalletSDKError
import com.coinbase.android.nativesdk.message.Content
import com.coinbase.android.nativesdk.message.Message
import com.coinbase.android.nativesdk.message.Response
import com.coinbase.android.nativesdk.message.ResponseHandler
import com.coinbase.android.nativesdk.message.ResponseResult
import java.util.Date

internal class TaskManager {
    private val tasks = HashMap<String, Task>()

    fun registerResponseHandler(message: Message, handler: ResponseHandler) {
        tasks[message.uuid] = Task(
            request = message,
            handler = handler,
            timestamp = Date()
        )
    }

    fun handleResponse(message: Message): Boolean {
        if (message.content !is Content.ResponseContent) {
            return false
        }

        val requestId: String
        val result: ResponseResult = when (val response = message.content.response) {
            is Response.Response -> {
                requestId = response.requestUUID
                Result.success(response)
            }
            is Response.Error -> {
                requestId = response.requestUUID
                Result.failure(CoinbaseWalletSDKError.WalletReturnedError(response.value))
            }
        }

        val task = tasks[requestId] ?: return false

        task.handler(result)
        tasks.remove(requestId)
        return true
    }
}
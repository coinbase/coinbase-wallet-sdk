package com.coinbase.android.nativesdk

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.coinbase.android.nativesdk.key.KeyManager
import com.coinbase.android.nativesdk.message.Content
import com.coinbase.android.nativesdk.message.Message
import com.coinbase.android.nativesdk.message.MessageConverter
import com.coinbase.android.nativesdk.message.Request
import com.coinbase.android.nativesdk.message.ResponseHandler
import com.coinbase.android.nativesdk.task.TaskManager
import java.security.interfaces.ECPublicKey
import java.util.UUID

const val CBW_APP_LINK = "go.cb-w.com"
const val CBW_PACKAGE_NAME = "org.toshi"
const val CBW_SCHEME = "cbwallet://"

typealias OpenIntentCallback = (Intent) -> Unit

class CoinbaseWalletSDK(
    domain: Uri,
    private val appContext: Context,
    private val hostPackageName: String = CBW_PACKAGE_NAME,
    private val openIntent: OpenIntentCallback
) {
    private val domain: Uri
    private val sdkVersion = BuildConfig.LIBRARY_VERSION_NAME
    private val keyManager by lazy { KeyManager(appContext, hostPackageName) }
    private val taskManager by lazy { TaskManager() }

    private val launchWalletIntent: Intent?
        get() = appContext.packageManager.getLaunchIntentForPackage(hostPackageName)

    val isWalletInstalled
        get() = launchWalletIntent != null

    init {
        this.domain = if (domain.pathSegments.size < 2) {
            domain.buildUpon()
                .appendPath("wsegue")
                .build()
        } else {
            domain
        }
    }

    fun initiateHandshake(initialRequest: Request.Request? = null, onResponse: ResponseHandler) {
        val message = Message(
            uuid = UUID.randomUUID().toString(),
            version = sdkVersion,
            sender = keyManager.ownPublicKey,
            content = Content.RequestContent(
                request = Request.Handshake(
                    domain = domain.toString(),
                    initialRequest = initialRequest
                )
            )
        )

        send(message, onResponse)
    }

    fun makeRequest(
        request: Request.Request,
        onResponse: ResponseHandler
    ) {
        val message = Message(
            uuid = UUID.randomUUID().toString(),
            sender = keyManager.ownPublicKey,
            version = sdkVersion,
            content = Content.RequestContent(request)
        )

        send(message, onResponse)
    }

    fun handleResponse(url: Uri): Boolean {
        if (!isWalletSegueResponseURL(url)) {
            return false
        }

        val ownPublicKey = keyManager.ownPublicKey
        val peerPublicKey = keyManager.peerPublicKey

        val message = MessageConverter.decode(
            url = url,
            ownPublicKey = ownPublicKey,
            ownPrivateKey = keyManager.ownPrivateKey,
            peerPublicKey = peerPublicKey
        )

        if (peerPublicKey == null && message.sender != ownPublicKey) {
            keyManager.storePeerPublicKey(message.sender as ECPublicKey)
        }

        return taskManager.handleResponse(message)
    }

    private fun send(message: Message, onResponse: ResponseHandler) {
        val uri = MessageConverter.encode(
            message = message,
            recipient = Uri.parse(CBW_SCHEME),
            ownPrivateKey = keyManager.ownPrivateKey,
            peerPublicKey = keyManager.peerPublicKey
        )

        val intent = launchWalletIntent
        if (intent == null) {
            onResponse(Result.failure(CoinbaseWalletSDKError.OpenWalletFailed))
            return
        }

        // Prevent intent from launching app in new window
        intent.type = Intent.ACTION_VIEW
        if (intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK > 0) {
            intent.flags = intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK.inv()
        }

        intent.data = uri

        taskManager.registerResponseHandler(message, onResponse)
        openIntent(intent)
    }

    private fun isWalletSegueResponseURL(uri: Uri): Boolean {
        return uri.host == domain.host && uri.path == domain.path && uri.getQueryParameter("p") != null
    }
}

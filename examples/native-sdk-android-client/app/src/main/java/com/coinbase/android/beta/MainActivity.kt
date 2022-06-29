package com.coinbase.android.beta

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.coinbase.android.nativesdk.CoinbaseWalletSDK
import com.coinbase.android.nativesdk.message.request.Action
import com.coinbase.android.nativesdk.message.request.RequestContent

class MainActivity : AppCompatActivity() {
    private val connectWalletButton
        get() = findViewById<Button>(R.id.connectWalletButton)

    private val textArea
        get() = findViewById<TextView>(R.id.textArea)

    private val personalSign
        get() = findViewById<Button>(R.id.personalSign)

    private lateinit var launcher: ActivityResultLauncher<Intent>

    private val client by lazy {
        CoinbaseWalletSDK(
            appContext = applicationContext,
            domain = Uri.parse("https://www.coinbase.com"),
            openIntent = { intent -> launcher.launch(intent) }
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uri = result.data?.data ?: return@registerForActivityResult
            client.handleResponse(uri)
        }
    }

    override fun onStart() {
        super.onStart()

        connectWalletButton.setOnClickListener {
            client.initiateHandshake(
                initialActions = listOf(
                    Action(
                        method = "eth_requestAccounts",
                        params = listOf()
                    )
                )
            ) { result ->
                result.fold(
                    onSuccess = { res ->
//                        textArea.text = "Handshake Successful: \n${res.results.joinToString()}"
                    },
                    onFailure = { err ->
                        textArea.text = "Handshake Error: \n${err.message}"
                    }
                )
            }
        }

        personalSign.setOnClickListener {
            client.makeRequest(
                request = RequestContent.Request(
                    actions = listOf(Action(method = "personal_sign", params = listOf("")))
                )
            ) { result ->
                result.fold(
                    onSuccess = { res ->
//                        textArea.text = "Request Successful: \n${res.results.joinToString()}"
                    },
                    onFailure = { err ->
                        textArea.text = "Request Error: \n${err.message}"
                    }
                )
            }
        }
    }
}
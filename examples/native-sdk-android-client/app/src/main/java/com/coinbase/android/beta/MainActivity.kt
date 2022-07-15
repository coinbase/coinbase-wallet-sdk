package com.coinbase.android.beta

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.coinbase.android.beta.databinding.ActivityMainBinding
import com.coinbase.android.nativesdk.CoinbaseWalletSDK
import com.coinbase.android.nativesdk.message.request.RequestContent
import com.coinbase.android.nativesdk.message.request.Web3JsonRPC
import com.coinbase.android.nativesdk.message.response.ReturnValue

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
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
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uri = result.data?.data ?: return@registerForActivityResult
            client.handleResponse(uri)
        }
    }

    override fun onStart() = with(binding) {
        super.onStart()

        setVisibility()
        connectWalletButton.setOnClickListener {
            client.initiateHandshake(
                initialActions = listOf(
                    Web3JsonRPC.RequestAccounts().action(), //Web3JsonRPC.SwitchEthereumChain(420).action()
                )
            ) { result: Result<List<ReturnValue>> ->
                result
                    .onSuccess { returnValues: List<ReturnValue> ->
                        textArea.text = buildString {
                            append("Handshake Successful\n\n")
                            returnValues.forEach { returnValue ->
                                if (returnValue is ReturnValue.Result) {
                                    append("Result: ${returnValue.value}")
                                }
                            }
                        }
                        setVisibility()
                    }
                    .onFailure { err ->
                        textArea.text = buildString {
                            append("Handshake Error: \n\n")
                            append(err.message)
                        }
                    }
            }
        }

        personalSign.setOnClickListener {
            client.makeRequest(
                request = RequestContent.Request(
                    actions = listOf(
                        //                        Web3JsonRPC.SwitchEthereumChain(420).action(),
                        //                        Web3JsonRPC.RequestAccounts().action(),
                        Web3JsonRPC.PersonalSign("0xabcdefabcdefabcdefabcdefabcdefabcdef", "Hello world").action()
                    )
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

        removeAccount.setOnClickListener {
            client.resetSession()
            setVisibility()
        }
    }

    private fun setVisibility() = with(binding) {
        val isConnected = client.hasEstablishedConnection
        connectContainer.isVisible = !isConnected
        requestContainer.isVisible = isConnected
    }
}
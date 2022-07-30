package com.coinbase.android.beta

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.isVisible
import com.coinbase.android.beta.databinding.ActivityMainBinding
import com.coinbase.android.nativesdk.CoinbaseWalletSDK
import com.coinbase.android.nativesdk.message.request.Action
import com.coinbase.android.nativesdk.message.request.RequestContent
import com.coinbase.android.nativesdk.message.response.ReturnValue
import com.google.android.material.shape.CornerFamily
import com.google.android.material.shape.MaterialShapeDrawable
import com.google.android.material.shape.ShapeAppearanceModel

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

        SharedPrefsManager.init(this)
        launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uri = result.data?.data ?: return@registerForActivityResult
            client.handleResponse(uri)
        }
    }

    override fun onStart() = with(binding) {
        super.onStart()

        setVisibility()
        connectWalletButton.setOnClickListener {
            val handShakeActions = ActionsManager.handShakeActions
            client.initiateHandshake(initialActions = handShakeActions) { result: Result<List<ReturnValue>> ->
                result.onSuccess { returnValues: List<ReturnValue> ->
                    returnValues.handleSuccess("Handshake", handShakeActions)
                }
                result.onFailure { err ->
                    err.handleError("HandShake")
                }
            }
        }

        personalSign.setOnClickListener {
            val requestActions = ActionsManager.getRequestActions(
                toAddress = "0x571a6a108adb08f9ca54fe8605280f9ee0ed4af6"
            )
            client.makeRequest(request = RequestContent.Request(actions = requestActions)) { result ->
                result.fold(
                    onSuccess = { returnValues ->
                        returnValues.handleSuccess("Request", requestActions)
                    },
                    onFailure = { err ->
                        err.handleError("Request")
                    }
                )
            }
        }

        removeAccount.setOnClickListener {
            client.resetSession()
            SharedPrefsManager.removeAccount()
            textArea.setText(R.string.connection_removed)
            setVisibility()
        }
    }

    private fun List<ReturnValue>.handleSuccess(requestType: String, actions: List<Action>) = with(binding) {
        textArea.text = buildString {
            if (actions.isEmpty()) {
                append("Handshake successful")
            } else {
                this@handleSuccess.forEachIndexed { index, returnValue ->
                    append(
                        "${actions[index].method} Result: " +
                                "${if (returnValue is ReturnValue.Result) "Success" else "Error"}\n"
                    )

                    val result = when (returnValue) {
                        is ReturnValue.Result -> {
                            if (actions[index].method == "eth_requestAccounts") {
                                SharedPrefsManager.account = returnValue.value
                            }
                            returnValue.value
                        }
                        is ReturnValue.Error -> returnValue.message
                    }
                    append("${result}\n\n")
                }
            }
        }
        setVisibility()
    }

    private fun Throwable.handleError(requestType: String) = with(binding) {
        textArea.text = buildString {
            append("$requestType Error: \n\n")
            append(message)
        }
    }

    private fun setVisibility() = with(binding) {
        val isConnected = client.hasEstablishedConnection
        connectContainer.isVisible = !isConnected
        requestContainer.isVisible = isConnected


        with(connectedStatus) {
            val radius = 28f
            val shapeAppearanceModel = ShapeAppearanceModel()
                .toBuilder()
                .setAllCorners(CornerFamily.ROUNDED, radius)
                .build()

            val shapeDrawable = MaterialShapeDrawable(shapeAppearanceModel)
            ViewCompat.setBackground(connectedStatus, shapeDrawable)

            if (isConnected) {
                text = getString(
                    R.string.connected_state,
                    "${SharedPrefsManager.account.take(5)}...${SharedPrefsManager.account.takeLast(4)}"
                )
                setTextColor(getColor(R.color.teal_200))
                shapeDrawable.setStroke(2.0f, getColor(R.color.teal_200))

            } else {
                setText(R.string.unconnected_state)
                setTextColor(getColor(R.color.red_error))
                shapeDrawable.setStroke(2.0f, getColor(R.color.red_error))
            }
        }
    }
}

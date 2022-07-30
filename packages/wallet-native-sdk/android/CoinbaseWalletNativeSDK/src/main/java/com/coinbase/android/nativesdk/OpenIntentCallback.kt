package com.coinbase.android.nativesdk

import android.content.Intent

interface OpenIntentCallback {
    fun call(intent: Intent)
}
// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package webhook

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

var (
	webhookID = "1234"
	eventID   = "5678"
	sessionID = "abcd"
	serverURL = "https://example.com"
)

func TestSuccessfulWebhookSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)

		defer r.Body.Close()

		requestBody := callParams{}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			require.FailNow(t, "unable to decode request body")
		}

		require.Equal(t, webhookID, requestBody.WebhookID)
		require.Equal(t, eventID, requestBody.EventID)
		require.Equal(t, sessionID, requestBody.SessionID)
		require.Equal(t, serverURL, requestBody.ServerURL)
	}))

	defer testServer.Close()

	wh := NewWebhook(serverURL)
	err := wh.Call(eventID, sessionID, webhookID, testServer.URL)
	require.Nil(t, err)
}

func TestFailedWebhookSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(
		w http.ResponseWriter, r *http.Request,
	) {
		w.WriteHeader(400)
	}))

	defer testServer.Close()

	wh := NewWebhook(serverURL)
	err := wh.Call(eventID, sessionID, webhookID, testServer.URL)
	require.EqualError(
		t, err, "sending notification failed with status code: 400",
	)
}

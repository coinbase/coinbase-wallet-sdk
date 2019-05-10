// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package notification

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/stretchr/testify/assert"
)

const (
	secret = "sdufhaspdfugapdufgapdugf"
	pushID = "12345"
	title  = "Push!"
	body   = "Here is your push notification"
)

var data = map[string]string{
	"someId": "1234",
}

func TestSuccessfulNotificationSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)

		response := SendResponse{
			Result: SendResponseResult{Sent: true},
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			require.FailNow(t, "unable to encode response body")
		}

		defer r.Body.Close()

		requestBody := sendParams{}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			require.FailNow(t, "unable to decode request body")
		}

		require.Equal(t, secret, requestBody.Secret)
		require.Equal(t, pushID, requestBody.PushID)
		require.Equal(t, title, requestBody.Title)
		require.Equal(t, body, requestBody.Body)
		require.Equal(t, data, requestBody.Data)
		require.Equal(t, notificationCategory, requestBody.Category)
	}))

	api := NewAPI(testServer.URL, secret)

	err := api.Send(pushID, title, body, data)
	require.Nil(t, err)
}

func TestFailedNotificationSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)

		response := SendResponse{
			Error:  SendResponseError{Message: "wrong api key"},
			Result: SendResponseResult{Sent: false},
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			assert.FailNow(t, "unable to encode response body")
		}

		r.Body.Close()
	}))

	api := NewAPI(testServer.URL, secret)

	err := api.Send(pushID, title, body, data)
	require.EqualError(
		t, err, "sending notification failed with error: wrong api key",
	)
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package notification

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

const (
	secret  = "sdufhaspdfugapdufgapdugf"
	address = "0x0000000000000000000000000000000000000000"
	title   = "Push!"
	body    = "Here is your push notification"
)

var data = map[string]string{
	"someId": "1234",
}

func TestSuccessfulNotificationSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)

		response := sendResponse{
			Result: sendResponseResult{Sent: true},
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			assert.FailNow(t, "unable to encode response body")
		}

		defer r.Body.Close()

		requestBody := sendParams{}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			assert.FailNow(t, "unable to decode request body")
		}

		assert.Equal(t, secret, requestBody.Secret)
		assert.Equal(t, address, requestBody.Address)
		assert.Equal(t, title, requestBody.Title)
		assert.Equal(t, body, requestBody.Body)
		assert.Equal(t, data, requestBody.Data)
	}))

	api := NewAPI(testServer.URL, secret)

	err := api.Send(address, title, body, data)
	assert.Nil(t, err)
}

func TestFailedNotificationSend(t *testing.T) {
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)

		response := sendResponse{
			Error:  sendResponseError{Message: "wrong api key"},
			Result: sendResponseResult{Sent: false},
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			assert.FailNow(t, "unable to encode response body")
		}

		r.Body.Close()
	}))

	api := NewAPI(testServer.URL, secret)

	err := api.Send(address, title, body, data)
	assert.EqualError(
		t, err, "sending notification failed with error: wrong api key",
	)
}

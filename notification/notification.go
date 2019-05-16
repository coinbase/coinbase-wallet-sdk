// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package notification

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/pkg/errors"
)

const notificationCategory = "wallet_link"

// API - used to broadcast push notifications
type API struct {
	serverURL string
	secret    string
}

// NewAPI - returns a new API instance
func NewAPI(serverURL string, secret string) *API {
	return &API{serverURL: serverURL, secret: secret}
}

// Send - send a push notification to a given pushID
func (a *API) Send(pushID, title, body string, data map[string]string) error {
	notification := sendParams{
		Secret:   a.secret,
		PushID:   pushID,
		Title:    title,
		Body:     body,
		Data:     data,
		Category: notificationCategory,
	}

	j, err := json.Marshal(notification)
	if err != nil {
		return errors.Wrap(err, "unable to marshal notification")
	}

	res, err := http.Post(a.serverURL, "application/json", bytes.NewBuffer(j))
	if err != nil {
		return errors.Wrap(err, "failed to send push notification request")
	}

	defer res.Body.Close()

	response := SendResponse{}

	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		return errors.Wrap(err, "unable to unmarshal notification response")
	}

	if !response.Result.Sent {
		errMsg := response.Error.Message
		if len(errMsg) == 0 {
			errMsg = "unknown error"
		}
		return errors.Errorf("sending notification failed with error: %s", errMsg)
	}

	return nil
}

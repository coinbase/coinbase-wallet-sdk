// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package webhook

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/pkg/errors"
)

// Caller - Interface for calling webhooks
type Caller interface {
	Call(eventID, sessionID, webhookID, webhookURL string) error
}

var _ Caller = (*Webhook)(nil)

// Webhook - used to broadcast push notifications
type Webhook struct {
	serverURL string
}

type callParams struct {
	EventID   string `json:"eventId"`
	SessionID string `json:"sessionId"`
	WebhookID string `json:"webhookId"`
	ServerURL string `json:"serverUrl"`
}

// NewWebhook - returns a new Webhook instance
func NewWebhook(serverURL string) *Webhook {
	return &Webhook{serverURL: serverURL}
}

// Call - call webhook to notify about a new event
func (a *Webhook) Call(eventID, sessionID, webhookID, webhookURL string) error {
	notification := callParams{
		EventID:   eventID,
		SessionID: sessionID,
		WebhookID: webhookID,
		ServerURL: a.serverURL,
	}

	pr, pw := io.Pipe()

	go func() {
		defer pw.Close()
		json.NewEncoder(pw).Encode(notification)
	}()

	res, err := http.Post(webhookURL, "application/json", pr)
	if err != nil {
		return errors.Wrap(err, "failed to call webhook")
	}

	if res.StatusCode != 200 {
		return errors.Errorf(
			"sending notification failed with status code: %d",
			res.StatusCode,
		)
	}

	return nil
}

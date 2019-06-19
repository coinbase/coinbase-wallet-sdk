// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"encoding/json"

	"github.com/pkg/errors"
)

const (
	clientMessageTypeHostSession      = "HostSession"
	clientMessageTypeJoinSession      = "JoinSession"
	clientMessageTypeIsLinked         = "IsLinked"
	clientMessageTypeSetSessionConfig = "SetSessionConfig"
	clientMessageTypeGetSessionConfig = "GetSessionConfig"
	clientMessageTypePublishEvent     = "PublishEvent"
)

type clientMessage interface{ xxxClientMessage() }
type _clientMessage struct{}

func (_clientMessage) xxxClientMessage() {}

type clientMessageEnvelope struct {
	Type string `json:"type"`
}

type clientMessageHostSession struct {
	_clientMessage
	Type       string `json:"type"`
	ID         int    `json:"id"`
	SessionID  string `json:"sessionId"`
	SessionKey string `json:"sessionKey"`
}

type clientMessageJoinSession struct {
	_clientMessage
	Type       string             `json:"type"`
	ID         int                `json:"id"`
	SessionID  string             `json:"sessionId"`
	SessionKey string             `json:"sessionKey"`
	WebhookID  *string            `json:"webhookId,omitempty"`
	WebhookURL *string            `json:"webhookUrl,omitempty"`
	Metadata   map[string]*string `json:"metadata,omitempty"`
}

type clientMessageIsLinked struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
}

type clientMessageSetSessionConfig struct {
	_clientMessage
	Type       string             `json:"type"`
	ID         int                `json:"id"`
	SessionID  string             `json:"sessionId"`
	WebhookID  *string            `json:"webhookId,omitempty"`
	WebhookURL *string            `json:"webhookUrl,omitempty"`
	Metadata   map[string]*string `json:"metadata,omitempty"`
}

type clientMessageGetSessionConfig struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
}

type clientMessagePublishEvent struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
	Event     string `json:"event"`
	Data      string `json:"data"`
}

func unmarshalClientMessage(
	data []byte,
) (msg clientMessage, msgType string, err error) {
	envelope := &clientMessageEnvelope{}
	if err := json.Unmarshal(data, envelope); err != nil {
		return nil, "", errors.Wrap(err, "failed to unmarshal client message")
	}

	switch envelope.Type {
	case clientMessageTypeHostSession:
		msg = &clientMessageHostSession{}
	case clientMessageTypeJoinSession:
		msg = &clientMessageJoinSession{}
	case clientMessageTypeIsLinked:
		msg = &clientMessageIsLinked{}
	case clientMessageTypeSetSessionConfig:
		msg = &clientMessageSetSessionConfig{}
	case clientMessageTypeGetSessionConfig:
		msg = &clientMessageGetSessionConfig{}
	case clientMessageTypePublishEvent:
		msg = &clientMessagePublishEvent{}
	default:
		return nil, envelope.Type, errors.Errorf(
			"unknown client message type: %s",
			envelope.Type,
		)
	}

	if err := json.Unmarshal(data, msg); err != nil {
		return nil, envelope.Type, errors.Wrapf(
			err,
			"failed to unmarshal client message of type: %s",
			envelope.Type,
		)
	}

	return msg, envelope.Type, nil
}

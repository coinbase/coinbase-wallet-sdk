// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"encoding/json"

	"github.com/pkg/errors"
)

const (
	clientMessageTypeHostSession  = "HostSession"
	clientMessageTypeJoinSession  = "JoinSession"
	clientMessageTypeSetPushID    = "SetPushID"
	clientMessageTypeSetMetadata  = "SetMetadata"
	clientMessageTypeGetMetadata  = "GetMetadata"
	clientMessageTypePublishEvent = "PublishEvent"
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
	SessionID  string `json:"session_id"`
	SessionKey string `json:"session_key"`
}

type clientMessageJoinSession struct {
	_clientMessage
	Type       string `json:"type"`
	ID         int    `json:"id"`
	SessionID  string `json:"session_id"`
	SessionKey string `json:"session_key"`
}

type clientMessageSetPushID struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"session_id"`
	PushID    string `json:"push_id"`
}

type clientMessageSetMetadata struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"session_id"`
	Key       string `json:"key"`
	Value     string `json:"value"`
}

type clientMessageGetMetadata struct {
	_clientMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"session_id"`
	Key       string `json:"key"`
}

type clientMessagePublishEvent struct {
	_clientMessage
	Type      string            `json:"type"`
	ID        int               `json:"id"`
	SessionID string            `json:"session_id"`
	Event     string            `json:"event"`
	Data      map[string]string `json:"data"`
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
	case clientMessageTypeSetPushID:
		msg = &clientMessageSetPushID{}
	case clientMessageTypeSetMetadata:
		msg = &clientMessageSetMetadata{}
	case clientMessageTypeGetMetadata:
		msg = &clientMessageGetMetadata{}
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

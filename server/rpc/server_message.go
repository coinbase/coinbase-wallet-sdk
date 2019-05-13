// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

const (
	serverMessageTypeOK             = "OK"
	serverMessageTypeFail           = "Fail"
	serverMessageTypeGetMetadataOK  = "GetMetadataOK"
	serverMessageTypePublishEventOK = "PublishEventOK"
	serverMessageTypeEvent          = "Event"
)

type serverMessage interface{ xxxServerMessage() }
type _serverMessage struct{}

func (_serverMessage) xxxServerMessage() {}

type serverMessageEnvelope struct {
	Type string `json:"type"`
}

type serverMessageOK struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
}

type serverMessageFail struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
	Error     string `json:"error"`
}

type serverMessageGetMetadataOK struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
	Key       string `json:"key"`
	Value     string `json:"value"`
}

type serverMessagePublishEventOK struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"sessionId"`
	EventID   string `json:"eventId"`
}

type serverMessageEvent struct {
	_serverMessage
	Type      string            `json:"type"`
	SessionID string            `json:"sessionId"`
	EventID   string            `json:"eventId"`
	Event     string            `json:"event"`
	Data      map[string]string `json:"data"`
}

func newServerMessageOK(id int, sessionID string) *serverMessageOK {
	return &serverMessageOK{
		Type:      serverMessageTypeOK,
		ID:        id,
		SessionID: sessionID,
	}
}

func newServerMessageFail(id int, sessionID, errMsg string) *serverMessageFail {
	return &serverMessageFail{
		Type:      serverMessageTypeFail,
		ID:        id,
		SessionID: sessionID,
		Error:     errMsg,
	}
}

func newServerMessageGetMetadataOK(
	id int, sessionID, key, value string,
) *serverMessageGetMetadataOK {
	return &serverMessageGetMetadataOK{
		Type:      serverMessageTypeGetMetadataOK,
		ID:        id,
		SessionID: sessionID,
		Key:       key,
		Value:     value,
	}
}

func newServerMessagePublishEventOK(
	id int, sessionID, eventID string,
) *serverMessagePublishEventOK {
	return &serverMessagePublishEventOK{
		Type:      serverMessageTypePublishEventOK,
		ID:        id,
		SessionID: sessionID,
		EventID:   eventID,
	}
}

func newServerMessageEvent(
	sessionID, eventID, event string, data map[string]string,
) *serverMessageEvent {
	return &serverMessageEvent{
		Type:      serverMessageTypeEvent,
		SessionID: sessionID,
		EventID:   eventID,
		Event:     event,
		Data:      data,
	}
}

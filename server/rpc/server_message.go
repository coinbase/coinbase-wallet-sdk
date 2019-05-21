// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

const (
	serverMessageTypeOK                   = "OK"
	serverMessageTypeFail                 = "Fail"
	serverMessageTypeGetSessionConfigOK   = "GetSessionConfigOK"
	serverMessageTypeSessionConfigUpdated = "SessionConfigUpdated"
	serverMessageTypePublishEventOK       = "PublishEventOK"
	serverMessageTypeEvent                = "Event"
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

type serverMessageGetSessionConfigOK struct {
	_serverMessage
	Type       string            `json:"type"`
	ID         int               `json:"id"`
	SessionID  string            `json:"sessionId"`
	WebhookID  string            `json:"webhookId"`
	WebhookURL string            `json:"webhookUrl"`
	Metadata   map[string]string `json:"metadata"`
}

type serverMessageSessionConfigUpdated struct {
	_serverMessage
	Type       string            `json:"type"`
	SessionID  string            `json:"sessionId"`
	WebhookID  string            `json:"webhookId"`
	WebhookURL string            `json:"webhookUrl"`
	Metadata   map[string]string `json:"metadata"`
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
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	EventID   string `json:"eventId"`
	Event     string `json:"event"`
	Data      string `json:"data"`
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

func newServerMessageGetSessionConfigOK(
	id int, sessionID, webhookID, webhookURL string, metadata map[string]string,
) *serverMessageGetSessionConfigOK {
	return &serverMessageGetSessionConfigOK{
		Type:       serverMessageTypeGetSessionConfigOK,
		ID:         id,
		SessionID:  sessionID,
		WebhookID:  webhookID,
		WebhookURL: webhookURL,
		Metadata:   metadata,
	}
}

func newServerMessageSessionConfigUpdated(
	sessionID, webhookID, webhookURL string, metadata map[string]string,
) *serverMessageSessionConfigUpdated {
	return &serverMessageSessionConfigUpdated{
		Type:       serverMessageTypeSessionConfigUpdated,
		SessionID:  sessionID,
		WebhookID:  webhookID,
		WebhookURL: webhookURL,
		Metadata:   metadata,
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
	sessionID, eventID, event string, data string,
) *serverMessageEvent {
	return &serverMessageEvent{
		Type:      serverMessageTypeEvent,
		SessionID: sessionID,
		EventID:   eventID,
		Event:     event,
		Data:      data,
	}
}

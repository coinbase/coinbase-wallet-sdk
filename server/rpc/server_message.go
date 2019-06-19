// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

const (
	serverMessageTypeOK                   = "OK"
	serverMessageTypeFail                 = "Fail"
	serverMessageTypeIsLinkedOK           = "IsLinkedOK"
	serverMessageTypeGetSessionConfigOK   = "GetSessionConfigOK"
	serverMessageTypeSessionConfigUpdated = "SessionConfigUpdated"
	serverMessageTypePublishEventOK       = "PublishEventOK"
	serverMessageTypeEvent                = "Event"
	serverMessageTypeLinked               = "Linked"
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

type serverMessageIsLinkedOK struct {
	_serverMessage
	Type         string `json:"type"`
	ID           int    `json:"id"`
	SessionID    string `json:"sessionId"`
	Linked       bool   `json:"linked"`
	OnlineGuests int    `json:"onlineGuests"`
}

type serverMessageLinked struct {
	_serverMessage
	Type         string            `json:"type"`
	SessionID    string            `json:"sessionId"`
	OnlineGuests int               `json:"onlineGuests"`
	WebhookID    string            `json:"webhookId,omitempty"`
	WebhookURL   string            `json:"webhookUrl,omitempty"`
	Metadata     map[string]string `json:"metadata"`
}

type serverMessageGetSessionConfigOK struct {
	_serverMessage
	Type       string            `json:"type"`
	ID         int               `json:"id"`
	SessionID  string            `json:"sessionId"`
	WebhookID  string            `json:"webhookId,omitempty"`
	WebhookURL string            `json:"webhookUrl,omitempty"`
	Metadata   map[string]string `json:"metadata"`
}

type serverMessageSessionConfigUpdated struct {
	_serverMessage
	Type       string            `json:"type"`
	SessionID  string            `json:"sessionId"`
	WebhookID  string            `json:"webhookId,omitempty"`
	WebhookURL string            `json:"webhookUrl,omitempty"`
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

func newServerMessageIsLinkedOK(
	id int, sessionID string, linked bool, onlineGuests int,
) *serverMessageIsLinkedOK {
	return &serverMessageIsLinkedOK{
		Type:         serverMessageTypeIsLinkedOK,
		ID:           id,
		SessionID:    sessionID,
		Linked:       linked,
		OnlineGuests: onlineGuests,
	}
}

func newServerMessageLinked(
	sessionID, webhookID, webhookURL string,
	onlineGuests int,
	metadata map[string]string,
) *serverMessageLinked {
	return &serverMessageLinked{
		Type:         serverMessageTypeLinked,
		SessionID:    sessionID,
		OnlineGuests: onlineGuests,
		WebhookID:    webhookID,
		WebhookURL:   webhookURL,
		Metadata:     metadata,
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

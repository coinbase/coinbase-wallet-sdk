// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

const (
	serverMessageTypeOK          = "OK"
	serverMessageTypeFail        = "Fail"
	serverMessageTypeGetMetadata = "GetMetadata"
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
	SessionID string `json:"session_id"`
}

type serverMessageFail struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id,omitempty"`
	SessionID string `json:"session_id,omitempty"`
	Error     string `json:"error"`
}

type serverMessageGetMetadata struct {
	_serverMessage
	Type      string `json:"type"`
	ID        int    `json:"id"`
	SessionID string `json:"session_id"`
	Key       string `json:"key"`
	Value     string `json:"value"`
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

func newServerMessageGetMetadata(
	id int, sessionID, key, value string,
) *serverMessageGetMetadata {
	return &serverMessageGetMetadata{
		Type:      serverMessageTypeGetMetadata,
		ID:        id,
		SessionID: sessionID,
		Key:       key,
		Value:     value,
	}
}

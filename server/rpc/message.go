// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

// ClientMessage - message originating from client
type ClientMessage struct {
	ID      int               `json:"i"`
	Message string            `json:"m"`
	Data    map[string]string `json:"d"`
}

// ServerMessage - message originating from server
type ServerMessage struct {
	ClientMessageID int               `json:"i,omitempty"`
	Message         string            `json:"m,omitempty"`
	Data            map[string]string `json:"d,omitempty"`
	Error           string            `json:"e,omitempty"`
	Fatal           bool              `json:"-"`
}

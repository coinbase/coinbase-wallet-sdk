// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

// Request - request message
type Request struct {
	ID      int               `json:"i"`
	Message string            `json:"m"`
	Data    map[string]string `json:"d"`
}

// Response - response message
type Response struct {
	ID          int               `json:"i"`
	Error       string            `json:"e,omitempty"`
	Data        map[string]string `json:"d,omitempty"`
	ShouldClose bool              `json:"-"`
}

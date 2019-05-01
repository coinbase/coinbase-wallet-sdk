// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

// RPCRequestMessage - RPC method
type RPCRequestMessage string

// FROM AGENTS:
const (
	// RPCRequestMessageCreateSession - create a session
	RPCRequestMessageCreateSession RPCRequestMessage = "createSession"
)

// FROM SIGNERS:
const (
	// RPCRequestMessageInitAuth - initiate authentication
	RPCRequestMessageInitAuth RPCRequestMessage = "initAuth"
	// RPCRequestMessageAuthenticate - authenticate
	RPCRequestMessageAuthenticate RPCRequestMessage = "authenticate"
)

// RPCResponseMessage - RPC response message
type RPCResponseMessage string

// RPCRequest - RPC request message
type RPCRequest struct {
	ID      int               `json:"i"`
	Message RPCRequestMessage `json:"m"`
	Data    map[string]string `json:"d"`
}

// RPCResponse - RPC response message
type RPCResponse struct {
	ID          int               `json:"i"`
	Error       string            `json:"e,omitempty"`
	Data        map[string]string `json:"d,omitempty"`
}

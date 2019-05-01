// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package server

// RPCRequestMessage - RPC method
type RPCRequestMessage string

const (
	// FOR AGENTS:

	// RPCRequestMessageCreateSession - create a session
	RPCRequestMessageCreateSession RPCRequestMessage = "createSession"

	// FOR SIGNERS:

	// RPCRequestMessageInitAuth - initiate authentication
	RPCRequestMessageInitAuth RPCRequestMessage = "initAuth"
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
	ID   int               `json:"i"`
	Data map[string]string `json:"d"`
}

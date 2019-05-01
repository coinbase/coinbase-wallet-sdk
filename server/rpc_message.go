// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package server

// RPCRequestMessage - RPC method
type RPCRequestMessage string

const (
	// RPCRequestMessageCreateSession - createSession
	RPCRequestMessageCreateSession RPCRequestMessage = "createSession"
	// RPCRequestMessageConnectSigner - connectSigner
	RPCRequestMessageConnectSigner RPCRequestMessage = "connectSigner"
)

// RPCResponseMessage - RPC response message
type RPCResponseMessage string

const (
	// RPCResponseMessageSessionCreated - emitted in response to createSession
	RPCResponseMessageSessionCreated RPCResponseMessage = "sessionCreated"
)

// RPCRequest - RPC request message
type RPCRequest struct {
	ID      int               `json:"i"`
	Message RPCRequestMessage `json:"m"`
	Data    map[string]string `json:"d"`
}

// RPCResponse - RPC response message
type RPCResponse struct {
	ID      int                `json:"i"`
	Message RPCResponseMessage `json:"m"`
	Data    map[string]string  `json:"d"`
}

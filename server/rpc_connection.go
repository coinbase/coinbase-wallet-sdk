// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

// RPCConnectionType - RPC session type
type RPCConnectionType int

const (
	// RPCConnectionTypeUnknown - not yet set
	RPCConnectionTypeUnknown RPCConnectionType = iota
	// RPCConnectionTypeAgent - agent
	RPCConnectionTypeAgent
	// RPCConnectionTypeSigner - client
	RPCConnectionTypeSigner
)

// RPCConnection - RPC session
type RPCConnection struct {
	connectionType RPCConnectionType
	store          store.Store
}

// NewRPCConnection - construct an RPCConnection
func NewRPCConnection(sto store.Store) (*RPCConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	return &RPCConnection{
		connectionType: RPCConnectionTypeUnknown,
		store:          sto,
	}, nil
}

// HandleMessage - handle an RPC message
func (rs *RPCConnection) HandleMessage(msg *RPCRequest) (*RPCResponse, error) {
	var res *RPCResponse
	var err error
	if msg.ID <= 0 {
		return nil, errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case RPCRequestMessageCreateSession:
		res, err = rs.handleConnectAgent(msg.ID, msg.Data)
	case RPCRequestMessageInitAuth:
		res, err = rs.handleInitAuth(msg.ID, msg.Data)
	}
	return res, err
}

func (rs *RPCConnection) handleConnectAgent(
	id int,
	data map[string]string,
) (*RPCResponse, error) {
	if rs.connectionType != RPCConnectionTypeUnknown {
		return nil, errors.Errorf("connection type already set")
	}

	sessID, ok := data["sessionID"]
	if !ok || sessID == "" {
		return nil, errors.Errorf("sessionID must be present")
	}

	sess, err := session.NewSession(sessID)
	// TODO: validate session ID
	if err != nil {
		return nil, errors.Wrap(err, "session creation failed")
	}

	if err := rs.store.AddSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	rs.connectionType = RPCConnectionTypeAgent

	return &RPCResponse{ID: id}, nil
}

func (rs *RPCConnection) handleInitAuth(
	id int,
	data map[string]string,
) (*RPCResponse, error) {
	if rs.connectionType != RPCConnectionTypeUnknown {
		return nil, errors.Errorf("connection type already set")
	}

	sessID, ok := data["sessionID"]
	// TODO: validate session ID
	if !ok || sessID == "" {
		return nil, errors.Errorf("sessionID must be present")
	}

	sess, err := rs.store.GetSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "could not get session")
	}
	if sess == nil {
		return nil, errors.Errorf("session not found")
	}

	address, ok := data["address"]
	// TODO: validate ethereum address
	if !ok || address == "" {
		return nil, errors.Errorf("address must be present")
	}

	rs.connectionType = RPCConnectionTypeSigner

	return &RPCResponse{
		ID: id,
		Data: map[string]string{
			"message": makeAuthMessage(address, sessID, sess.Nonce()),
		},
	}, nil
}

func makeAuthMessage(address, sessionID, nonce string) string {
	return fmt.Sprintf(
		"WalletLink\n\nAddress: %s\nSession ID: %s\n\n%s",
		strings.ToLower(address),
		sessionID,
		nonce,
	)
}

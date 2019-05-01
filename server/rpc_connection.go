// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/pkg/ethereum"
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
	session        *session.Session
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
	// FROM AGENTS:
	case RPCRequestMessageCreateSession:
		res, err = rs.handleCreateSession(msg.ID, msg.Data)

	// FROM SIGNERS:
	case RPCRequestMessageInitAuth:
		res, err = rs.handleInitAuth(msg.ID, msg.Data)
	case RPCRequestMessageAuthenticate:
		res, err = rs.handleAuthenticate(msg.ID, msg.Data)
	}

	return res, err
}

func (rs *RPCConnection) handleCreateSession(
	id int,
	data map[string]string,
) (*RPCResponse, error) {
	if rs.connectionType != RPCConnectionTypeUnknown {
		return nil, errors.Errorf("connection type already set")
	}

	sessID, ok := data["sessionID"]
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("sessionID must be present")
	}

	sess, err := rs.store.GetSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		sess, err = session.NewSession(sessID)
		if err != nil {
			return nil, errors.Wrap(err, "session creation failed")
		}
	}

	if err := rs.store.AddSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	rs.connectionType = RPCConnectionTypeAgent
	rs.session = sess

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
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("sessionID must be valid")
	}

	sess, err := rs.store.GetSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "could not get session")
	}
	if sess == nil {
		return nil, errors.Errorf("session not found")
	}

	address, ok := data["address"]
	if !ok {
		return nil, errors.Errorf("address must be present")
	}
	address = strings.ToLower(address)
	if !ethereum.IsValidAddress(address) {
		return nil, errors.Errorf("invalid ethereum address")
	}

	rs.connectionType = RPCConnectionTypeSigner
	rs.session = sess

	return &RPCResponse{
		ID: id,
		Data: map[string]string{
			"message": makeAuthMessage(address, sessID, sess.Nonce()),
		},
	}, nil
}

func (rs *RPCConnection) handleAuthenticate(
	id int,
	data map[string]string,
) (*RPCResponse, error) {
	if rs.connectionType != RPCConnectionTypeSigner {
		return nil, errors.Errorf("connection type must be signer")
	}
	if rs.session == nil {
		return nil, errors.Errorf("session must be present")
	}

	signature, ok := data["signature"]
	if !ok {
		return nil, errors.Errorf("signature must be present")
	}

	address, ok := data["address"]
	if !ok {
		return nil, errors.Errorf("address must be present")
	}
	address = strings.ToLower(address)

	if !ethereum.IsValidAddress(address) {
		return nil, errors.Errorf("invalid ethereum address")
	}

	sigBytes, err := hex.DecodeString(signature)
	if err != nil {
		return nil, errors.Wrap(err, "signature must be in hexadecimal characters")
	}

	message := makeAuthMessage(address, rs.session.ID(), rs.session.Nonce())
	recoveredAddress, err := ethereum.EcRecover(message, sigBytes)
	if err != nil || address != recoveredAddress {
		return nil, errors.Errorf("signature verification failed")
	}

	return &RPCResponse{ID: id}, nil
}

func makeAuthMessage(address, sessionID, nonce string) string {
	return fmt.Sprintf(
		"WalletLink\n\nAddress: %s\nSession ID: %s\n\n%s",
		strings.ToLower(address),
		sessionID,
		nonce,
	)
}

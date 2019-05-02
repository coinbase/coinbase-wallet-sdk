// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/pkg/ethereum"
	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

const (
	// SignerMessageInitAuth - initiate authentication
	SignerMessageInitAuth = "initAuth"
	// SignerMessageAuthenticate - authenticate
	SignerMessageAuthenticate = "authenticate"
)

// SignerConnection - signer connection
type SignerConnection struct {
	store   store.Store
	session *session.Session
}

// NewSignerConnection - construct a SignerConnection
func NewSignerConnection(sto store.Store) (*SignerConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	return &SignerConnection{
		store: sto,
	}, nil
}

// HandleMessage - handle an RPC message
func (sc *SignerConnection) HandleMessage(msg *Request) (*Response, error) {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return nil, errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case SignerMessageInitAuth:
		res, err = sc.handleInitAuth(msg.ID, msg.Data)
	case SignerMessageAuthenticate:
		res, err = sc.handleAuthenticate(msg.ID, msg.Data)
	}

	return res, err
}

func (sc *SignerConnection) handleInitAuth(
	id int,
	data map[string]string,
) (*Response, error) {
	sessID, ok := data["sessionID"]
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("sessionID must be valid")
	}

	sess, err := sc.store.GetSession(sessID)
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

	sc.session = sess

	return &Response{
		ID: id,
		Data: map[string]string{
			"message": makeAuthMessage(address, sessID, sess.Nonce()),
		},
	}, nil
}

func (sc *SignerConnection) handleAuthenticate(
	id int,
	data map[string]string,
) (*Response, error) {
	if sc.session == nil {
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

	message := makeAuthMessage(address, sc.session.ID(), sc.session.Nonce())
	recoveredAddress, err := ethereum.EcRecover(message, sigBytes)
	if err != nil || address != recoveredAddress {
		return nil, errors.Errorf("signature verification failed")
	}

	return &Response{ID: id}, nil
}

func makeAuthMessage(address, sessionID, nonce string) string {
	return fmt.Sprintf(
		"WalletLink\n\nAddress: %s\nSession ID: %s\n\n%s",
		strings.ToLower(address),
		sessionID,
		nonce,
	)
}

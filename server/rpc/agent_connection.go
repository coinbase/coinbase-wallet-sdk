// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

const (
	// AgentMessageCreateSession - create sesion
	AgentMessageCreateSession = "createSession"
)

// AgentConnection - agent connection
type AgentConnection struct {
	store   store.Store
	session *session.Session
}

// NewAgentConnection - construct an AgentConnection
func NewAgentConnection(sto store.Store) (*AgentConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	return &AgentConnection{
		store: sto,
	}, nil
}

// HandleMessage - handle an RPC message
func (ac *AgentConnection) HandleMessage(msg *Request) (*Response, error) {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return nil, errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case AgentMessageCreateSession:
		res, err = ac.handleCreateSession(msg.ID, msg.Data)
	}

	return res, err
}

func (ac *AgentConnection) handleCreateSession(
	id int,
	data map[string]string,
) (*Response, error) {
	sessID, ok := data["sessionID"]
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("sessionID must be present")
	}

	sess, err := ac.store.GetSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		sess, err = session.NewSession(sessID)
		if err != nil {
			return nil, errors.Wrap(err, "session creation failed")
		}
	}

	if err := ac.store.AddSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	ac.session = sess

	return &Response{ID: id}, nil
}

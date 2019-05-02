// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"sync"

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
	store           store.Store
	session         *session.Session
	sendMessageLock sync.Mutex
	sendMessage     SendMessageFunc
}

var _ Connection = (*AgentConnection)(nil)

// NewAgentConnection - construct an AgentConnection
func NewAgentConnection(
	sto store.Store,
	sendMessage SendMessageFunc,
) (*AgentConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	if sendMessage == nil {
		return nil, errors.Errorf("sendMessage must not be nil")
	}
	return &AgentConnection{
		store:       sto,
		sendMessage: sendMessage,
	}, nil
}

// SendMessage - send message to connection
func (ac *AgentConnection) SendMessage(msg interface{}) error {
	ac.sendMessageLock.Lock()
	defer ac.sendMessageLock.Unlock()
	return ac.sendMessage(msg)
}

// HandleMessage - handle an RPC message
func (ac *AgentConnection) HandleMessage(msg *Request) error {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case AgentMessageCreateSession:
		res, err = ac.handleCreateSession(msg.ID, msg.Data)
	}

	if res != nil {
		if err := ac.SendMessage(res); err != nil {
			return errors.Wrap(err, "failed to send message")
		}
	}

	return err
}

func (ac *AgentConnection) handleCreateSession(
	id int,
	data map[string]string,
) (*Response, error) {
	sessID, ok := data["sessionID"]
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("sessionID must be present")
	}

	sess, err := ac.store.LoadSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		sess, err = session.NewSession(sessID)
		if err != nil {
			return nil, errors.Wrap(err, "session creation failed")
		}
	}

	if err := ac.store.SaveSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	ac.session = sess

	return &Response{ID: id}, nil
}

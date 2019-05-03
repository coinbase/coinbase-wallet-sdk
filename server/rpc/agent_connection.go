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
	sendMessageLock sync.Mutex
	sendMessage     SendMessageFunc
	session         *session.Session

	store        store.Store
	agentPubSub  *PubSub
	signerPubSub *PubSub
}

var _ Connection = (*AgentConnection)(nil)

// NewAgentConnection - construct an AgentConnection
func NewAgentConnection(
	sendMessage SendMessageFunc,
	sto store.Store,
	agentPubSub *PubSub,
	signerPubSub *PubSub,
) (*AgentConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	if sendMessage == nil {
		return nil, errors.Errorf("sendMessage must not be nil")
	}
	if agentPubSub == nil {
		return nil, errors.Errorf("agentPubSub must not be nil")
	}
	if signerPubSub == nil {
		return nil, errors.Errorf("signerPubSub must not be nil")
	}
	return &AgentConnection{
		sendMessage:  sendMessage,
		store:        sto,
		agentPubSub:  agentPubSub,
		signerPubSub: signerPubSub,
	}, nil
}

// SendMessage - send message to connection
func (ac *AgentConnection) SendMessage(msg interface{}) error {
	if ac.sendMessage == nil {
		return nil
	}
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

// CleanUp - unsubscribes from pubsub
func (ac *AgentConnection) CleanUp() {
	if ac.session != nil {
		ac.agentPubSub.Unsubscribe(ac.session.ID(), ac)
	}
	ac.sendMessage = nil
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

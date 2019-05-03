// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"sync"

	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

const (
	// HostMessageCreateSession - create session
	HostMessageCreateSession = "createSession"
)

// HostConnection - host connection
type HostConnection struct {
	sendMessageLock sync.Mutex
	sendMessage     SendMessageFunc
	session         *session.Session

	store       store.Store
	hostPubSub  *PubSub
	guestPubSub *PubSub
}

var _ Connection = (*HostConnection)(nil)

// NewHostConnection - construct an HostConnection
func NewHostConnection(
	sendMessage SendMessageFunc,
	sto store.Store,
	hostPubSub *PubSub,
	guestPubSub *PubSub,
) (*HostConnection, error) {
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	if sendMessage == nil {
		return nil, errors.Errorf("sendMessage must not be nil")
	}
	if hostPubSub == nil {
		return nil, errors.Errorf("hostPubSub must not be nil")
	}
	if guestPubSub == nil {
		return nil, errors.Errorf("guestPubSub must not be nil")
	}
	return &HostConnection{
		sendMessage: sendMessage,
		store:       sto,
		hostPubSub:  hostPubSub,
		guestPubSub: guestPubSub,
	}, nil
}

// SendMessage - send message to connection
func (ac *HostConnection) SendMessage(msg interface{}) error {
	if ac.sendMessage == nil {
		return nil
	}
	ac.sendMessageLock.Lock()
	defer ac.sendMessageLock.Unlock()
	return ac.sendMessage(msg)
}

// HandleMessage - handle an RPC message
func (ac *HostConnection) HandleMessage(msg *Request) error {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case HostMessageCreateSession:
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
func (ac *HostConnection) CleanUp() {
	if ac.session != nil {
		ac.hostPubSub.Unsubscribe(ac.session.ID(), ac)
	}
	ac.sendMessage = nil
}

func (ac *HostConnection) handleCreateSession(
	id int,
	data map[string]string,
) (*Response, error) {
	sessID, ok := data["id"]
	if !ok || !session.IsValidID(sessID) {
		return nil, errors.Errorf("id must be valid")
	}

	sessKey, ok := data["key"]
	if !ok || !session.IsValidKey(sessKey) {
		return nil, errors.Errorf("key must be valid")
	}

	sess, err := ac.store.LoadSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		sess, err = session.NewSession(sessID, sessKey)
		if err != nil {
			return nil, errors.Wrap(err, "session creation failed")
		}
	}

	if err := ac.store.SaveSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	ac.session = sess
	ac.hostPubSub.Subscribe(sessID, ac)

	return &Response{ID: id}, nil
}

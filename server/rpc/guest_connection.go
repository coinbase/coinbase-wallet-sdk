// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"sync"

	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

const (
	// GuestMessageJoinSession - join session
	GuestMessageJoinSession = "joinSession"
)

// GuestConnection - guest connection
type GuestConnection struct {
	sendMessageLock sync.Mutex
	sendMessage     SendMessageFunc
	session         *session.Session

	store       store.Store
	hostPubSub  *PubSub
	guestPubSub *PubSub
}

var _ Connection = (*GuestConnection)(nil)

// NewGuestConnection - construct a GuestConnection
func NewGuestConnection(
	sendMessage SendMessageFunc,
	sto store.Store,
	hostPubSub *PubSub,
	guestPubSub *PubSub,
) (*GuestConnection, error) {
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
	return &GuestConnection{
		store:       sto,
		sendMessage: sendMessage,
		hostPubSub:  hostPubSub,
		guestPubSub: guestPubSub,
	}, nil
}

// SendMessage - send message to connection
func (sc *GuestConnection) SendMessage(msg interface{}) error {
	if sc.sendMessage == nil {
		return nil
	}
	sc.sendMessageLock.Lock()
	defer sc.sendMessageLock.Unlock()
	return sc.sendMessage(msg)
}

// HandleMessage - handle an RPC message
func (sc *GuestConnection) HandleMessage(msg *Request) error {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case GuestMessageJoinSession:
		res, err = sc.handleJoinSession(msg.ID, msg.Data)
	}

	if res != nil {
		if err := sc.SendMessage(res); err != nil {
			return errors.Wrap(err, "failed to send message")
		}
	}

	return err
}

// CleanUp - unsubscribes from pubsub
func (sc *GuestConnection) CleanUp() {
	if sc.session != nil {
		sc.guestPubSub.Unsubscribe(sc.session.ID(), sc)
	}
	sc.sendMessage = nil
}

func (sc *GuestConnection) handleJoinSession(
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

	sess, err := sc.store.LoadSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		return nil, errors.Errorf("session not found")
	}

	sc.session = sess
	sc.guestPubSub.Subscribe(sessID, sc)

	return &Response{ID: id}, nil
}

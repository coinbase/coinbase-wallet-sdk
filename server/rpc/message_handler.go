// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
)

const (
	// HostMessageCreateSession - create session
	HostMessageCreateSession = "createSession"

	// GuestMessageJoinSession - join session
	GuestMessageJoinSession = "joinSession"
)

// MessageHandler - handles rpc messages
type MessageHandler struct {
	session *session.Session

	sendCh chan<- interface{}
	subCh  chan interface{}

	store       store.Store
	hostPubSub  *PubSub
	guestPubSub *PubSub
}

// NewMessageHandler - construct a MessageHandler
func NewMessageHandler(
	sendCh chan<- interface{},
	sto store.Store,
	hostPubSub *PubSub,
	guestPubSub *PubSub,
) (*MessageHandler, error) {
	if sendCh == nil {
		return nil, errors.Errorf("sendCh must not be nil")
	}
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	if hostPubSub == nil {
		return nil, errors.Errorf("hostPubSub must not be nil")
	}
	if guestPubSub == nil {
		return nil, errors.Errorf("guestPubSub must not be nil")
	}
	return &MessageHandler{
		sendCh:      sendCh,
		subCh:       make(chan interface{}),
		store:       sto,
		hostPubSub:  hostPubSub,
		guestPubSub: guestPubSub,
	}, nil
}

// Handle - handle an RPC message
func (c *MessageHandler) Handle(msg *Request) error {
	var res *Response
	var err error
	if msg.ID <= 0 {
		return errors.Errorf("id is invalid")
	}

	switch msg.Message {
	case HostMessageCreateSession:
		res, err = c.handleCreateSession(msg.ID, msg.Data)

	case GuestMessageJoinSession:
		res, err = c.handleJoinSession(msg.ID, msg.Data)
	}

	if res != nil {
		c.sendCh <- res
	}

	return err
}

// Close - clean up
func (c *MessageHandler) Close() {
	if c.session != nil {
		c.hostPubSub.Unsubscribe(c.session.ID(), c.subCh)
	}
	close(c.subCh)
}

func (c *MessageHandler) handleCreateSession(
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

	sess, err := c.store.LoadSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		sess, err = session.NewSession(sessID, sessKey)
		if err != nil {
			return nil, errors.Wrap(err, "session creation failed")
		}
	}

	if err := c.store.SaveSession(sess); err != nil {
		return nil, errors.Wrap(err, "session could not be stored")
	}

	c.session = sess
	c.hostPubSub.Subscribe(sessID, c.subCh)

	return &Response{ID: id}, nil
}

func (c *MessageHandler) handleJoinSession(
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

	sess, err := c.store.LoadSession(sessID)
	if err != nil {
		return nil, errors.Wrap(err, "attempting to get existing session failed")
	}
	if sess == nil {
		return nil, errors.Errorf("session not found")
	}

	c.session = sess
	c.guestPubSub.Subscribe(sessID, c.subCh)

	return &Response{ID: id}, nil
}

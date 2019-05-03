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

	// GuestMessageJoinSession - join session
	GuestMessageJoinSession = "joinSession"
)

// SendMessageFunc - callback function to send a message
type SendMessageFunc = func(msg interface{}) error

// MessageHandler - handles rpc messages
type MessageHandler struct {
	sendMessageLock sync.Mutex
	sendMessage     SendMessageFunc
	session         *session.Session

	store       store.Store
	hostPubSub  *PubSub
	guestPubSub *PubSub
}

// MessageHandler conforms to MessageSender interface
var _ MessageSender = (*MessageHandler)(nil)

// NewMessageHandler - construct a MessageHandler
func NewMessageHandler(
	sendMessage SendMessageFunc,
	sto store.Store,
	hostPubSub *PubSub,
	guestPubSub *PubSub,
) (*MessageHandler, error) {
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
	return &MessageHandler{
		sendMessage: sendMessage,
		store:       sto,
		hostPubSub:  hostPubSub,
		guestPubSub: guestPubSub,
	}, nil
}

// SendMessage - send message to connection
func (c *MessageHandler) SendMessage(msg interface{}) error {
	if c.sendMessage == nil {
		return nil
	}
	c.sendMessageLock.Lock()
	defer c.sendMessageLock.Unlock()
	return c.sendMessage(msg)
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
		if err := c.SendMessage(res); err != nil {
			return errors.Wrap(err, "failed to send message")
		}
	}

	return err
}

// CleanUp - unsubscribes from pubsub
func (c *MessageHandler) CleanUp() {
	if c.session != nil {
		c.hostPubSub.Unsubscribe(c.session.ID(), c)
	}
	c.sendMessage = nil
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
	c.hostPubSub.Subscribe(sessID, c)

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
	c.guestPubSub.Subscribe(sessID, c)

	return &Response{ID: id}, nil
}

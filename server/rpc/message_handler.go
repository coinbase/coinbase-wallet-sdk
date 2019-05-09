// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"fmt"

	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/pkg/errors"
)

// MessageHandler - handles RPC messages
type MessageHandler struct {
	authedSessions util.StringSet // IDs of authenticated sessions
	isHost         bool

	sendCh chan<- interface{}
	store  store.Store
	pubSub *PubSub
}

// NewMessageHandler - construct a MessageHandler
func NewMessageHandler(
	sendCh chan<- interface{},
	sto store.Store,
	pubSub *PubSub,
) (*MessageHandler, error) {
	if sendCh == nil {
		return nil, errors.Errorf("sendCh must not be nil")
	}
	if sto == nil {
		return nil, errors.Errorf("store must not be nil")
	}
	if pubSub == nil {
		return nil, errors.Errorf("pubSub must not be nil")
	}
	return &MessageHandler{
		authedSessions: util.NewStringSet(),
		isHost:         false,
		sendCh:         sendCh,
		store:          sto,
		pubSub:         pubSub,
	}, nil
}

// HandleRawMessage - handle a raw client message
func (c *MessageHandler) HandleRawMessage(data []byte) error {
	msg, msgType, err := unmarshalClientMessage(data)
	if err != nil {
		return err
	}

	var res serverMessage

	switch msg := msg.(type) {
	case *clientMessageHostSession:
		res = c.handleHostSession(msg)
	case *clientMessageJoinSession:
		res = c.handleJoinSession(msg)
	case *clientMessageSetPushID:
		res = c.handleSetPushID(msg)
	case *clientMessageSetMetadata:
		res = c.handleSetMetadata(msg)
	case *clientMessageGetMetadata:
		res = c.handleGetMetadata(msg)
	case *clientMessagePublishEvent:
		res = c.handlePublishEvent(msg)
	default:
		errMsg := fmt.Sprintf("unsupported message type: %s", msgType)
		res = newServerMessageFail(0, "", errMsg)
	}

	if res != nil {
		c.sendCh <- res
	}

	return nil
}

// Close - clean up
func (c *MessageHandler) Close() {
	c.pubSub.UnsubscribeAll(c.sendCh)
}

func (c *MessageHandler) handleHostSession(
	msg *clientMessageHostSession,
) serverMessage {
	if c.isHost {
		return newServerMessageFail(
			msg.ID, msg.SessionID, "cannot host more than one session",
		)
	}

	session, err := c.findSessionWithIDAndKey(msg.SessionID, msg.SessionKey)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	if session == nil {
		// there isn't an existing session; persist the new session
		session = &models.Session{ID: msg.SessionID, Key: msg.SessionKey}
		if err := session.Save(c.store); err != nil {
			fmt.Println(err)
			return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
		}
	}

	c.isHost = true
	c.authedSessions.Add(msg.SessionID)
	c.pubSub.Subscribe(hostPubSubID(msg.SessionID), c.sendCh)

	return newServerMessageOK(msg.ID, msg.SessionID)
}

func (c *MessageHandler) handleJoinSession(
	msg *clientMessageJoinSession,
) serverMessage {
	if c.isHost {
		return newServerMessageFail(
			msg.ID, msg.SessionID, "host cannot join a session",
		)
	}

	session, err := c.findSessionWithIDAndKey(msg.SessionID, msg.SessionKey)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	if session == nil {
		// there isn't an existing session; fail
		errMsg := fmt.Sprintf("no such session: %s", msg.SessionID)
		return newServerMessageFail(msg.ID, msg.SessionID, errMsg)
	}

	c.authedSessions.Add(msg.SessionID)
	c.pubSub.Subscribe(guestPubSubID(msg.SessionID), c.sendCh)

	return newServerMessageOK(msg.ID, msg.SessionID)
}

func (c *MessageHandler) handleSetPushID(
	msg *clientMessageSetPushID,
) serverMessage {
	if !models.IsValidSessionPushID(msg.PushID) {
		return newServerMessageFail(msg.ID, msg.SessionID, "invalid push ID")
	}

	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	session.SetPushID(msg.PushID)
	if err := session.Save(c.store); err != nil {
		fmt.Println(err)
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	return newServerMessageOK(msg.ID, msg.SessionID)
}

func (c *MessageHandler) handleSetMetadata(
	msg *clientMessageSetMetadata,
) serverMessage {
	if !models.IsValidSessionMetadataKey(msg.Key) {
		return newServerMessageFail(msg.ID, msg.SessionID, "invalid metadata key")
	}
	if !models.IsValidSessionMetadataValue(msg.Value) {
		return newServerMessageFail(msg.ID, msg.SessionID, "invalid metadata value")
	}

	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	session.SetMetadata(msg.Key, msg.Value)
	if err := session.Save(c.store); err != nil {
		fmt.Println(err)
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	return newServerMessageOK(msg.ID, msg.SessionID)
}

func (c *MessageHandler) handleGetMetadata(
	msg *clientMessageGetMetadata,
) serverMessage {
	if !models.IsValidSessionMetadataKey(msg.Key) {
		return newServerMessageFail(msg.ID, msg.SessionID, "invalid metadata key")
	}

	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	value := session.GetMetadata(msg.Key)

	return newServerMessageGetMetadataOK(msg.ID, msg.SessionID, msg.Key, value)
}

func (c *MessageHandler) handlePublishEvent(
	msg *clientMessagePublishEvent,
) serverMessage {
	lenEvent := len(msg.Event)
	if lenEvent == 0 || lenEvent > 100 {
		return newServerMessageFail(msg.ID, msg.SessionID, "invalid event name")
	}

	if !c.authedSessions.Contains(msg.SessionID) {
		errMsg := fmt.Sprintf("not authenticated to session: %s", msg.SessionID)
		return newServerMessageFail(msg.ID, msg.SessionID, errMsg)
	}

	eventID, err := util.RandomHex(4)
	if err != nil {
		fmt.Println(errors.Wrap(err, "failed to generate eventID"))
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	event := &models.Event{
		ID:    eventID,
		Event: msg.Event,
		Data:  msg.Data,
	}
	if err := event.Save(c.store, msg.SessionID); err != nil {
		fmt.Println(err)
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	var subID string
	if c.isHost {
		// if host, publish to guests
		subID = guestPubSubID(msg.SessionID)
	} else {
		// if guest, publish to host
		subID = hostPubSubID(msg.SessionID)
	}

	eventMsg := newServerMessageEvent(msg.SessionID, eventID, msg.Event, msg.Data)
	c.pubSub.Publish(subID, eventMsg)

	return newServerMessagePublishEventOK(msg.ID, msg.SessionID, eventID)
}

func (c *MessageHandler) findSessionWithIDAndKey(
	sessionID string,
	sessionKey string,
) (*models.Session, error) {
	if !models.IsValidSessionID(sessionID) {
		return nil, errors.New("invalid session id")
	}
	if !models.IsValidSessionKey(sessionKey) {
		return nil, errors.New("invalid session key")
	}

	session, err := models.LoadSession(c.store, sessionID)
	if err != nil {
		fmt.Println(err)
		return nil, errors.New("internal error")
	}
	if session == nil {
		return nil, nil
	}

	// there is an existing session; check that session key matches
	if session.Key != sessionKey {
		return nil, errors.New("incorrect session key")
	}

	return session, nil
}

func (c *MessageHandler) findAuthedSessionWithID(
	sessionID string,
) (*models.Session, error) {
	if !c.authedSessions.Contains(sessionID) {
		return nil, errors.Errorf("not authenticated to session: %s", sessionID)
	}

	session, err := models.LoadSession(c.store, sessionID)
	if err != nil {
		fmt.Println(err)
		return nil, errors.New("internal error")
	}
	if session == nil {
		return nil, errors.New("session is gone somehow")
	}

	return session, nil
}

func hostPubSubID(sessionID string) string {
	return "h." + sessionID
}

func guestPubSubID(sessionID string) string {
	return "g." + sessionID
}

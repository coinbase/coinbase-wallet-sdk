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
	authedSessions util.StringSet     // IDs of authenticated sessions
	isHost         bool               // if the current connection is the host
	sendCh         chan<- interface{} // send channel that writes to websocket
	store          store.Store        // the current persistence store
	pubSub         *PubSub            // publish-subscribe instance
}

// NewMessageHandler - construct a MessageHandler
// A single message handler is allocated per websocket connection.
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

	// handle heartbeat request
	if len(data) == 1 && data[0] == 'h' {
		c.sendCh <- 'h'
		return nil
	}

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
	case *clientMessageIsLinked:
		res = c.handleIsLinked(msg)
	case *clientMessageSetSessionConfig:
		res = c.handleSetSessionConfig(msg)
	case *clientMessageGetSessionConfig:
		res = c.handleGetSessionConfig(msg)
	case *clientMessagePublishEvent:
		res = c.handlePublishEvent(msg)
	default:
		errMsg := fmt.Sprintf("unsupported message type: %s", msgType)
		res = newServerMessageFail(0, "", errMsg)
	}

	// send response to websocket
	if res != nil {
		c.sendCh <- res
	}

	return nil
}

// Close - clean up
func (c *MessageHandler) Close() {
	c.pubSub.UnsubscribeAll(c.sendCh)
}

// handleHostSession creates or binds an existing session to the to-be host.
// If successfully authenticated, the host will be subscribed to the sessions pubsub instance.
// Only a single host per session is supported.
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

	// there isn't an existing session; persist the new session
	if session == nil {
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

// handleJoinSession binds an existing session to a to-be guest.
// If successfully authenticated, a guest will be subscribed to the pubsub instance of the session.
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

	session.Linked = true
	if err := session.Save(c.store); err != nil {
		fmt.Println(err)
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	c.authedSessions.Add(msg.SessionID)
	gpsID := guestPubSubID(msg.SessionID)
	c.pubSub.Subscribe(gpsID, c.sendCh)
	onlineGuests := c.pubSub.Len(gpsID)

	// send Linked message to host
	subID := hostPubSubID(msg.SessionID)
	joinedMsg := newServerMessageLinked(msg.SessionID, onlineGuests)
	c.pubSub.Publish(subID, joinedMsg)

	return newServerMessageOK(msg.ID, msg.SessionID)
}

// handleIsLinked allows for hosts to check if any guests are online
func (c *MessageHandler) handleIsLinked(
	msg *clientMessageIsLinked,
) serverMessage {
	if !c.isHost {
		return newServerMessageFail(
			msg.ID, msg.SessionID, "only hosts are allowed",
		)
	}

	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	onlineGuests := c.pubSub.Len(guestPubSubID(msg.SessionID))

	return newServerMessageIsLinkedOK(
		msg.ID, msg.SessionID, session.Linked, onlineGuests,
	)
}

// handleSetSessionConfig allows for a guest to set metadata associated with the session.
func (c *MessageHandler) handleSetSessionConfig(
	msg *clientMessageSetSessionConfig,
) serverMessage {
	if c.isHost {
		return newServerMessageFail(
			msg.ID, msg.SessionID, "only guests can set session config",
		)
	}

	if valid, invalidReason := models.IsValidSessionConfig(
		msg.WebhookID,
		msg.WebhookURL,
		msg.Metadata,
	); !valid {
		return newServerMessageFail(msg.ID, msg.SessionID, invalidReason)
	}

	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	session.WebhookID = msg.WebhookID
	session.WebhookURL = msg.WebhookURL
	session.Metadata = msg.Metadata
	if err := session.Save(c.store); err != nil {
		fmt.Println(err)
		return newServerMessageFail(msg.ID, msg.SessionID, "internal error")
	}

	// send SessionConfigUpdated message to host
	subID := hostPubSubID(msg.SessionID)
	updatedMsg := newServerMessageSessionConfigUpdated(
		msg.SessionID, msg.WebhookID, msg.WebhookURL, msg.Metadata,
	)
	c.pubSub.Publish(subID, updatedMsg)

	return newServerMessageOK(msg.ID, msg.SessionID)
}

// handleGetSessionConfig allows for a session participant to get the current session config.
func (c *MessageHandler) handleGetSessionConfig(
	msg *clientMessageGetSessionConfig,
) serverMessage {
	session, err := c.findAuthedSessionWithID(msg.SessionID)
	if err != nil {
		return newServerMessageFail(msg.ID, msg.SessionID, err.Error())
	}

	return newServerMessageGetSessionConfigOK(
		msg.ID,
		msg.SessionID,
		session.WebhookID,
		session.WebhookURL,
		session.Metadata,
	)
}

// handlePublishEvent allows for a session participant to publish an event to their counterparty.
// Ex. a session published by a guest will be propagated to the respective sessions' host.
// A session published by a host will be propagated to the respective sessions' guests.
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

// findSessionWithIDAndKey fetches a session associated with a sessionID and a sessionKey.
// Used to check for existence of a session.
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

// findAuthedSessionWithID fetches a session from a sessionID iff the session participant has
// already been authenticated.
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

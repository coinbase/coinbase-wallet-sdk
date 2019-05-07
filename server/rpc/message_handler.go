// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"fmt"
	"strings"

	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/pkg/errors"
)

const (
	// MessageHostSession - host session
	MessageHostSession = "hostSession"
	// MessageJoinSession - join session
	MessageJoinSession = "joinSession"
	// MessageSetMetadata - set session metadata
	MessageSetMetadata = "setMetadata"
	// MessageGetMetadata - get session metadata
	MessageGetMetadata = "getMetadata"
)

// MessageHandler - handles rpc messages
type MessageHandler struct {
	authedSessions util.StringSet // IDs of authenticated sessions
	isHost         bool

	sendCh chan<- interface{}
	subCh  chan interface{}

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
		subCh:          make(chan interface{}),
		store:          sto,
		pubSub:         pubSub,
	}, nil
}

// Handle - handle an RPC message
func (c *MessageHandler) Handle(req *Request) (ok bool) {
	var res *Response

	if req.ID < 1 {
		res = errorResponse(req.ID, "invalid request ID", true)
	} else {
		switch req.Message {
		case MessageHostSession:
			res = c.handleHostSession(req.ID, req.Data)

		case MessageJoinSession:
			res = c.handleJoinSession(req.ID, req.Data)

		case MessageSetMetadata:
			res = c.handleSetMetadata(req.ID, req.Data)

		case MessageGetMetadata:
			res = c.handleGetMetadata(req.ID, req.Data)
		}
	}

	if res == nil {
		res = errorResponse(req.ID, "unsupported message", true)
	}

	c.sendCh <- res

	return !res.Fatal
}

// Close - clean up
func (c *MessageHandler) Close() {
	c.pubSub.UnsubscribeAll(c.subCh)
	close(c.subCh)
}

func (c *MessageHandler) handleHostSession(
	requestID int,
	data map[string]string,
) *Response {
	if c.isHost {
		return errorResponse(requestID, "cannot host more than one session", false)
	}

	sessionID, sessionKey := data["id"], data["key"]

	session, res := c.findSessionWithIDAndKey(requestID, sessionID, sessionKey)
	if res != nil {
		return res
	}

	if session == nil {
		// there isn't an existing session; persist the new session
		session = &models.Session{ID: sessionID, Key: sessionKey}
		if err := c.store.Set(session.StoreKey(), session); err != nil {
			fmt.Println(errors.Wrap(err, "failed to persist session"))
			return errorResponse(requestID, "internal error", true)
		}
	}

	c.isHost = true
	c.authedSessions.Add(sessionID)
	c.pubSub.Subscribe(hostPubSubID(sessionID), c.subCh)

	return &Response{RequestID: requestID}
}

func (c *MessageHandler) handleJoinSession(
	requestID int,
	data map[string]string,
) *Response {
	if c.isHost {
		return errorResponse(requestID, "host cannot join a session", false)
	}

	sessionID, sessionKey := data["id"], data["key"]

	session, res := c.findSessionWithIDAndKey(requestID, sessionID, sessionKey)
	if res != nil {
		return res
	}

	if session == nil {
		// there isn't an existing session; fail
		errMsg := fmt.Sprintf("no such session: %s", sessionID)
		return errorResponse(requestID, errMsg, false)
	}

	c.authedSessions.Add(sessionID)
	c.pubSub.Subscribe(guestPubSubID(sessionID), c.subCh)

	return &Response{RequestID: requestID}
}

func (c *MessageHandler) handleSetMetadata(
	requestID int,
	data map[string]string,
) *Response {
	sessionID := data["id"]
	metadataKey := strings.TrimSpace(data["metadataKey"])
	metadataValue := data["metadataValue"]

	session, res := c.findAuthedSessionWithID(requestID, sessionID)
	if res != nil {
		return res
	}

	session.SetMetadata(metadataKey, metadataValue)
	if err := c.store.Set(session.StoreKey(), session); err != nil {
		fmt.Println(errors.Wrap(err, "failed to persist session"))
		return errorResponse(requestID, "internal error", true)
	}

	return &Response{RequestID: requestID}
}

func (c *MessageHandler) handleGetMetadata(
	requestID int,
	data map[string]string,
) *Response {
	sessionID := data["id"]
	metadataKey := strings.TrimSpace(data["metadataKey"])

	session, res := c.findAuthedSessionWithID(requestID, sessionID)
	if res != nil {
		return res
	}

	metadataValue := session.GetMetadata(metadataKey)

	return &Response{
		RequestID: requestID,
		Data: map[string]string{
			"value": metadataValue,
		},
	}
}

func (c *MessageHandler) findSessionWithIDAndKey(
	requestID int,
	sessionID string,
	sessionKey string,
) (*models.Session, *Response) {
	if !models.IsValidSessionID(sessionID) {
		return nil, errorResponse(requestID, "invalid session id", true)
	}
	if !models.IsValidSessionKey(sessionKey) {
		return nil, errorResponse(requestID, "invalid session key", true)
	}

	session, err := c.loadSession(sessionID)
	if err != nil {
		fmt.Println(err)
		return nil, errorResponse(requestID, "internal error", true)
	}
	if session == nil {
		return nil, nil
	}

	// there is an existing session; check that session key matches
	if session.Key != sessionKey {
		return nil, errorResponse(requestID, "incorrect session key", true)
	}

	return session, nil
}

func (c *MessageHandler) findAuthedSessionWithID(
	requestID int,
	sessionID string,
) (*models.Session, *Response) {
	if !c.authedSessions.Contains(sessionID) {
		errMsg := fmt.Sprintf("not authenticated to session: %s", sessionID)
		return nil, errorResponse(requestID, errMsg, false)
	}

	session, err := c.loadSession(sessionID)
	if err != nil {
		fmt.Println(err)
		return nil, errorResponse(requestID, "internal error", true)
	}
	if session == nil {
		return nil, errorResponse(requestID, "session is gone somehow", true)
	}

	return session, nil
}

func (c *MessageHandler) loadSession(sessionID string) (*models.Session, error) {
	session := &models.Session{ID: sessionID}
	ok, err := c.store.Get(session.StoreKey(), session)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load session")
	}

	if !ok {
		return nil, nil
	}

	return session, nil
}

func errorResponse(requestID int, errorMessage string, fatal bool) *Response {
	return &Response{
		RequestID: requestID,
		Error:     errorMessage,
		Fatal:     fatal,
	}
}

func hostPubSubID(sessionID string) string {
	return "h." + sessionID
}

func guestPubSubID(sessionID string) string {
	return "g." + sessionID
}

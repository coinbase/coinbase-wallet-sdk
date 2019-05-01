// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

func TestRPC(t *testing.T) {
	srv := NewServer()
	testSrv := httptest.NewServer(srv.router)
	defer testSrv.Close()

	agentReqID := 1
	signerReqID := 1

	rpcURL := strings.Replace(testSrv.URL, "http", "ws", 1) + "/rpc"
	agentWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	assert.Nil(t, err)
	defer agentWs.Close()

	signerWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	assert.Nil(t, err)
	defer signerWs.Close()

	// agent generates sessionId and secret
	sessionID := "c9db0147e942b2675045e3f61b247692"
	// secret := "29115acb7e001f1092e97552471c1116"

	// session should not exist yet
	sess, err := srv.store.GetSession(sessionID)
	assert.Nil(t, sess)
	assert.Nil(t, err)

	err = agentWs.WriteJSON(RPCRequest{
		ID:      agentReqID,
		Message: RPCRequestMessageCreateSession,
		Data: map[string]string{
			"sessionID": sessionID,
		},
	})
	assert.Nil(t, err)

	rcvd := &RPCResponse{}
	err = agentWs.ReadJSON(rcvd)
	assert.Nil(t, err)

	assert.Equal(t, agentReqID, rcvd.ID)

	// session should be created
	sess, err = srv.store.GetSession(sessionID)
	assert.NotNil(t, sess)
	assert.Nil(t, err)
	assert.NotEmpty(t, sess.Nonce)

	// signer scans the QR code, obtains sessionId and secret, and then connects
	// to server

	address := "0x0000000000000000000000000000000000000000"

	err = signerWs.WriteJSON(RPCRequest{
		ID:      signerReqID,
		Message: RPCRequestMessageInitAuth,
		Data: map[string]string{
			"sessionID": sessionID,
			"address":   address,
		},
	})
	assert.Nil(t, err)

	// backend then sends a message that should be signed by the signer

	err = signerWs.ReadJSON(rcvd)
	assert.Nil(t, err)

	message := makeAuthMessage(address, sessionID, sess.Nonce())

	assert.Equal(t, signerReqID, rcvd.ID)
	assert.Equal(t, message, rcvd.Data["message"])
}

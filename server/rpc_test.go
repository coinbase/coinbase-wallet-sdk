// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/pkg/crypto"
	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
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

	agentWs, _, err := websocket.DefaultDialer.Dial(rpcURL+"/agent", nil)
	assert.Nil(t, err)
	defer agentWs.Close()

	signerWs, _, err := websocket.DefaultDialer.Dial(rpcURL+"/signer", nil)
	assert.Nil(t, err)
	defer signerWs.Close()

	// agent generates sessionID and secret
	sessionID := "c9db0147e942b2675045e3f61b247692"
	secret := "29115acb7e001f1092e97552471c1116"

	// agent then derives a sessionKey from sessionID and secret
	sessionKey := hex.EncodeToString(crypto.SHA256(
		[]byte(fmt.Sprintf("%s %s WalletLink", sessionID, secret)),
	))

	// assert that session does not exist yet
	sess, err := srv.store.LoadSession(sessionID)
	assert.Nil(t, sess)
	assert.Nil(t, err)

	// agent makes a request to the server with sessionID and sessionKey
	err = agentWs.WriteJSON(rpc.Request{
		ID:      agentReqID,
		Message: rpc.AgentMessageCreateSession,
		Data: map[string]string{
			"id":  sessionID,
			"key": sessionKey,
		},
	})
	assert.Nil(t, err)

	// agent receives a response back from server
	res := &rpc.Response{}
	err = agentWs.ReadJSON(res)
	assert.Nil(t, err)

	assert.Equal(t, agentReqID, res.ID)
	assert.Empty(t, res.Error)

	// session should be created
	sess, err = srv.store.LoadSession(sessionID)
	assert.Nil(t, err)
	assert.NotNil(t, sess)
	assert.Equal(t, sess.ID(), sessionID)
	assert.Equal(t, sess.Key(), sessionKey)

	// signer scans the QR code, obtains sessionId and secret, derives sessionKey
	// from sessionID and secret and makes a request to the server

	err = signerWs.WriteJSON(rpc.Request{
		ID:      signerReqID,
		Message: rpc.SignerMessageJoinSession,
		Data: map[string]string{
			"id":  sessionID,
			"key": sessionKey,
		},
	})
	assert.Nil(t, err)

	// server response

	err = signerWs.ReadJSON(res)
	assert.Nil(t, err)

	assert.Equal(t, signerReqID, res.ID)
	assert.Empty(t, res.Error)
}

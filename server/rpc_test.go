// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/pkg/ethereum"
	"github.com/CoinbaseWallet/walletlinkd/pkg/secp256k1"
	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

var (
	privateKey, _ = secp256k1.PrivateKeyFromString(
		"9703fceda5a0bada47af806d90d8e33250b71308ea583b37a1d0615c683e7fce",
	)
	address = "0xfa1f9244527E708e37e3db30ec04fcae621eA694"
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

	// agent generates sessionId and secret
	sessionID := "c9db0147e942b2675045e3f61b247692"
	// secret := "29115acb7e001f1092e97552471c1116"

	// session should not exist yet
	sess, err := srv.store.GetSession(sessionID)
	assert.Nil(t, sess)
	assert.Nil(t, err)

	err = agentWs.WriteJSON(rpc.Request{
		ID:      agentReqID,
		Message: rpc.AgentMessageCreateSession,
		Data: map[string]string{
			"sessionID": sessionID,
		},
	})
	assert.Nil(t, err)

	res := &rpc.Response{}
	err = agentWs.ReadJSON(res)
	assert.Nil(t, err)

	assert.Equal(t, agentReqID, res.ID)
	assert.Empty(t, res.Error)

	// session should be created
	sess, err = srv.store.GetSession(sessionID)
	assert.NotNil(t, sess)
	assert.Nil(t, err)
	assert.NotEmpty(t, sess.Nonce)

	// signer scans the QR code, obtains sessionId and secret, and then connects
	// to server

	err = signerWs.WriteJSON(rpc.Request{
		ID:      signerReqID,
		Message: rpc.SignerMessageInitAuth,
		Data: map[string]string{
			"sessionID": sessionID,
			"address":   address,
		},
	})
	assert.Nil(t, err)

	// backend then sends a message that should be signed by the signer

	err = signerWs.ReadJSON(res)
	assert.Nil(t, err)

	message := fmt.Sprintf(
		"WalletLink\n\nAddress: %s\nSession ID: %s\n\n%s",
		strings.ToLower(address),
		sessionID,
		sess.Nonce(),
	)

	assert.Equal(t, signerReqID, res.ID)
	assert.Empty(t, res.Error)
	assert.Equal(t, message, res.Data["message"])

	// signer then signs the message and authenticate with it

	sig, err := ethereum.EthSign(message, privateKey)
	assert.Nil(t, err)
	sigHex := hex.EncodeToString(sig)

	signerReqID++
	err = signerWs.WriteJSON(rpc.Request{
		ID:      signerReqID,
		Message: rpc.SignerMessageAuthenticate,
		Data: map[string]string{
			"signature": sigHex,
			"address":   address,
		},
	})
	assert.Nil(t, err)

	// backend validates the signature

	err = signerWs.ReadJSON(res)
	assert.Nil(t, err)

	assert.Equal(t, signerReqID, res.ID)
	assert.Empty(t, res.Error)
}

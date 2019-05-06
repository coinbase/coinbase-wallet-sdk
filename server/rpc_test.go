// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
)

func TestRPC(t *testing.T) {
	srv := NewServer()
	testSrv := httptest.NewServer(srv.router)
	defer testSrv.Close()

	rpcURL := strings.Replace(testSrv.URL, "http", "ws", 1) + "/rpc"

	hostWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	require.Nil(t, err)
	defer hostWs.Close()

	// host generates sessionID and secret
	sessionID := "c9db0147e942b2675045e3f61b247692"
	secret := "29115acb7e001f1092e97552471c1116"

	// host then derives a sessionKey from sessionID and secret
	sessionKey := hex.EncodeToString(util.SHA256(
		[]byte(fmt.Sprintf("%s %s WalletLink", sessionID, secret)),
	))

	// assert that session does not exist yet
	session := models.Session{ID: sessionID}
	ok, err := srv.store.Get(session.StoreKey(), &session)
	require.Nil(t, err)
	require.False(t, ok)

	// host makes a request to the server with sessionID and sessionKey
	err = hostWs.WriteJSON(rpc.Request{
		ID:      1,
		Message: rpc.HostMessageHostSession,
		Data: map[string]string{
			"id":  sessionID,
			"key": sessionKey,
		},
	})
	require.Nil(t, err)

	// host receives a response back from server
	res := &rpc.Response{}
	err = hostWs.ReadJSON(res)
	require.Nil(t, err)

	require.Equal(t, 1, res.RequestID)
	require.Empty(t, res.Error)

	// session should be created
	ok, err = srv.store.Get(session.StoreKey(), &session)
	require.Nil(t, err)
	require.True(t, ok)
	require.Equal(t, session.ID, sessionID)
	require.Equal(t, session.Key, sessionKey)

	// guest scans the QR code, obtains sessionId and secret, derives sessionKey
	// from sessionID and secret and makes a request to the server

	guestWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	require.Nil(t, err)
	defer guestWs.Close()

	err = guestWs.WriteJSON(rpc.Request{
		ID:      1,
		Message: rpc.GuestMessageJoinSession,
		Data: map[string]string{
			"id":  sessionID,
			"key": sessionKey,
		},
	})
	require.Nil(t, err)

	// server responds

	err = guestWs.ReadJSON(res)
	require.Nil(t, err)

	require.Equal(t, 1, res.RequestID)
	require.Empty(t, res.Error)
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
)

type jsonMap map[string]interface{}

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
	session, err := models.LoadSession(srv.store, sessionID)
	require.Nil(t, err)
	require.Nil(t, session)

	// host makes a request to the server with sessionID and sessionKey
	err = hostWs.WriteJSON(jsonMap{
		"type":        "HostSession",
		"id":          1,
		"session_id":  sessionID,
		"session_key": sessionKey,
	})
	require.Nil(t, err)

	// host receives a response back from server
	res := jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "OK",
		"id":         float64(1),
		"session_id": sessionID,
	}, res)

	// session should be created
	session, err = models.LoadSession(srv.store, sessionID)
	require.Nil(t, err)
	require.Equal(t, session.ID, sessionID)
	require.Equal(t, session.Key, sessionKey)

	// guest scans the QR code, obtains sessionId and secret, derives sessionKey
	// from sessionID and secret and makes a request to the server
	guestWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	require.Nil(t, err)
	defer guestWs.Close()

	err = guestWs.WriteJSON(jsonMap{
		"type":        "JoinSession",
		"id":          1,
		"session_id":  sessionID,
		"session_key": sessionKey,
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "OK",
		"id":         float64(1),
		"session_id": sessionID,
	}, res)

	// guest sets push ID
	err = guestWs.WriteJSON(jsonMap{
		"type":       "SetPushID",
		"id":         2,
		"session_id": sessionID,
		"push_id":    "1234abcd",
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "OK",
		"id":         float64(2),
		"session_id": sessionID,
	}, res)

	// guest sets metadata
	err = guestWs.WriteJSON(jsonMap{
		"type":       "SetMetadata",
		"id":         3,
		"session_id": sessionID,
		"key":        "foo",
		"value":      "hello world",
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "OK",
		"id":         float64(3),
		"session_id": sessionID,
	}, res)

	// host reads metadata
	err = hostWs.WriteJSON(jsonMap{
		"type":       "GetMetadata",
		"id":         2,
		"session_id": sessionID,
		"key":        "foo",
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "GetMetadataOK",
		"id":         float64(2),
		"session_id": sessionID,
		"key":        "foo",
		"value":      "hello world",
	}, res)

	// host publishes an event
	err = hostWs.WriteJSON(jsonMap{
		"type":       "PublishEvent",
		"id":         3,
		"session_id": sessionID,
		"event":      "do_something",
		"data": map[string]string{
			"with_this": "data",
			"and":       "this_data",
			"some_id":   "123",
		},
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "PublishEventOK", res["type"])
	require.Equal(t, float64(3), res["id"])
	require.Equal(t, sessionID, res["session_id"])
	eventID, ok := res["event_id"].(string)
	require.True(t, ok)
	require.Len(t, eventID, 8)
	require.True(t, util.IsHexString(eventID))

	// server sends event to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "Event", res["type"])
	require.Equal(t, sessionID, res["session_id"])
	require.Equal(t, eventID, res["event_id"])
	require.Equal(t, "do_something", res["event"])
	require.Equal(t, map[string]interface{}{
		"with_this": "data",
		"and":       "this_data",
		"some_id":   "123",
	}, res["data"])

	// guest publishes an event
	err = guestWs.WriteJSON(jsonMap{
		"type":       "PublishEvent",
		"id":         4,
		"session_id": sessionID,
		"event":      "did_something",
		"data": map[string]string{
			"result":  "was_great",
			"some_id": "123",
		},
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "PublishEventOK", res["type"])
	require.Equal(t, float64(4), res["id"])
	require.Equal(t, sessionID, res["session_id"])
	eventID, ok = res["event_id"].(string)
	require.True(t, ok)
	require.Len(t, eventID, 8)
	require.True(t, util.IsHexString(eventID))

	// server sends event to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "Event", res["type"])
	require.Equal(t, sessionID, res["session_id"])
	require.Equal(t, eventID, res["event_id"])
	require.Equal(t, "did_something", res["event"])
	require.Equal(t, map[string]interface{}{
		"result":  "was_great",
		"some_id": "123",
	}, res["data"])
}

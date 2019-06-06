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
	srv := NewServer(nil)
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

	hostReqID := 1
	guestReqID := 1

	// host makes a request to the server with sessionID and sessionKey
	err = hostWs.WriteJSON(jsonMap{
		"type":       "HostSession",
		"id":         hostReqID,
		"sessionId":  sessionID,
		"sessionKey": sessionKey,
	})
	require.Nil(t, err)

	// host receives a response back from server
	res := jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(hostReqID),
		"sessionId": sessionID,
	}, res)

	// session should be created
	session, err = models.LoadSession(srv.store, sessionID)
	require.Nil(t, err)
	require.Equal(t, session.ID, sessionID)
	require.Equal(t, session.Key, sessionKey)

	// host calls IsLinked
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "IsLinked",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// host receives a response back from server
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":         "IsLinkedOK",
		"id":           float64(hostReqID),
		"sessionId":    sessionID,
		"linked":       false,
		"onlineGuests": float64(0),
	}, res)

	// guest scans the QR code, obtains sessionId and secret, derives sessionKey
	// from sessionID and secret and makes a request to the server
	guestWs, _, err := websocket.DefaultDialer.Dial(rpcURL, nil)
	require.Nil(t, err)
	defer guestWs.Close()

	err = guestWs.WriteJSON(jsonMap{
		"type":       "JoinSession",
		"id":         guestReqID,
		"sessionId":  sessionID,
		"sessionKey": sessionKey,
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(guestReqID),
		"sessionId": sessionID,
	}, res)

	// server sends Linked message to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":         "Linked",
		"sessionId":    sessionID,
		"onlineGuests": float64(1),
	}, res)

	// host calls IsLinked again
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "IsLinked",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// host receives a response back from server
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":         "IsLinkedOK",
		"id":           float64(hostReqID),
		"sessionId":    sessionID,
		"linked":       true,
		"onlineGuests": float64(1),
	}, res)

	// guest sets session config
	guestReqID++
	err = guestWs.WriteJSON(jsonMap{
		"type":       "SetSessionConfig",
		"id":         guestReqID,
		"sessionId":  sessionID,
		"webhookId":  "1234abcd",
		"webhookUrl": "https://example.com/",
		"metadata": map[string]string{
			"foo": "hello world",
			"bar": "1234",
		},
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(guestReqID),
		"sessionId": sessionID,
	}, res)

	// server sends SessionConfigUpdated message to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "SessionConfigUpdated",
		"sessionId":  sessionID,
		"webhookId":  "1234abcd",
		"webhookUrl": "https://example.com/",
		"metadata": map[string]interface{}{
			"foo": "hello world",
			"bar": "1234",
		},
	}, res)

	// host reads session config
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "GetSessionConfig",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "GetSessionConfigOK",
		"id":         float64(hostReqID),
		"sessionId":  sessionID,
		"webhookId":  "1234abcd",
		"webhookUrl": "https://example.com/",
		"metadata": map[string]interface{}{
			"foo": "hello world",
			"bar": "1234",
		},
	}, res)

	// guest updates session config - add metadata value
	guestReqID++
	err = guestWs.WriteJSON(jsonMap{
		"type":      "SetSessionConfig",
		"id":        guestReqID,
		"sessionId": sessionID,
		"metadata": map[string]string{
			"baz": "abcdefg",
		},
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(guestReqID),
		"sessionId": sessionID,
	}, res)

	// server sends SessionConfigUpdated message to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "SessionConfigUpdated",
		"sessionId":  sessionID,
		"webhookId":  webhookID,
		"webhookUrl": webhookURL,
		"metadata": map[string]interface{}{
			"foo": "hello world",
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	// host reads session config
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "GetSessionConfig",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "GetSessionConfigOK",
		"id":         float64(hostReqID),
		"sessionId":  sessionID,
		"webhookId":  webhookID,
		"webhookUrl": webhookURL,
		"metadata": map[string]interface{}{
			"foo": "hello world",
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	// guest updates session config - remove metadata value
	guestReqID++
	err = guestWs.WriteJSON(jsonMap{
		"type":      "SetSessionConfig",
		"id":        guestReqID,
		"sessionId": sessionID,
		"metadata": map[string]*string{
			"foo": nil,
		},
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(guestReqID),
		"sessionId": sessionID,
	}, res)

	// server sends SessionConfigUpdated message to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "SessionConfigUpdated",
		"sessionId":  sessionID,
		"webhookId":  webhookID,
		"webhookUrl": webhookURL,
		"metadata": map[string]interface{}{
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	// host reads session config
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "GetSessionConfig",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":       "GetSessionConfigOK",
		"id":         float64(hostReqID),
		"sessionId":  sessionID,
		"webhookId":  webhookID,
		"webhookUrl": webhookURL,
		"metadata": map[string]interface{}{
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	// guest updates session config - remove webhook URL
	guestReqID++
	err = guestWs.WriteJSON(jsonMap{
		"type":       "SetSessionConfig",
		"id":         guestReqID,
		"webhookUrl": "",
		"sessionId":  sessionID,
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "OK",
		"id":        float64(guestReqID),
		"sessionId": sessionID,
	}, res)

	// server sends SessionConfigUpdated message to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "SessionConfigUpdated",
		"sessionId": sessionID,
		"webhookId": webhookID,
		"metadata": map[string]interface{}{
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	// host reads session config
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "GetSessionConfig",
		"id":        hostReqID,
		"sessionId": sessionID,
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "GetSessionConfigOK",
		"id":        float64(hostReqID),
		"sessionId": sessionID,
		"webhookId": webhookID,
		"metadata": map[string]interface{}{
			"bar": "1234",
			"baz": "abcdefg",
		},
	}, res)

	eventName := "do_something"
	eventData := "foobarbaz123"

	// host publishes an event
	hostReqID++
	err = hostWs.WriteJSON(jsonMap{
		"type":      "PublishEvent",
		"id":        hostReqID,
		"sessionId": sessionID,
		"event":     eventName,
		"data":      eventData,
	})
	require.Nil(t, err)

	// server responds to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "PublishEventOK", res["type"])
	require.Equal(t, float64(hostReqID), res["id"])
	require.Equal(t, sessionID, res["sessionId"])

	eventID, ok := res["eventId"].(string)
	require.True(t, ok)
	require.Len(t, eventID, 8)
	require.True(t, util.IsHexString(eventID))

	// the event published by the host should have been persisted
	event, err := models.LoadEvent(srv.store, sessionID, eventID)
	require.Nil(t, err)
	require.NotNil(t, event)
	require.Equal(t, eventID, event.ID)
	require.Equal(t, eventName, event.Event)
	require.Equal(t, eventData, event.Data)

	// server sends event to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "Event",
		"sessionId": sessionID,
		"eventId":   eventID,
		"event":     eventName,
		"data":      eventData,
	}, res)

	eventName = "did_something"
	eventData = "quxquxabc"

	// guest publishes an event
	guestReqID++
	err = guestWs.WriteJSON(jsonMap{
		"type":      "PublishEvent",
		"id":        guestReqID,
		"sessionId": sessionID,
		"event":     eventName,
		"data":      eventData,
	})
	require.Nil(t, err)

	// server responds to guest
	res = jsonMap{}
	err = guestWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, "PublishEventOK", res["type"])
	require.Equal(t, float64(guestReqID), res["id"])
	require.Equal(t, sessionID, res["sessionId"])

	eventID, ok = res["eventId"].(string)
	require.True(t, ok)
	require.Len(t, eventID, 8)
	require.True(t, util.IsHexString(eventID))

	// the event published by the guest should have been persisted
	event, err = models.LoadEvent(srv.store, sessionID, eventID)
	require.Nil(t, err)
	require.NotNil(t, event)
	require.Equal(t, eventID, event.ID)
	require.Equal(t, eventName, event.Event)
	require.Equal(t, eventData, event.Data)

	// server sends event to host
	res = jsonMap{}
	err = hostWs.ReadJSON(&res)
	require.Nil(t, err)
	require.Equal(t, jsonMap{
		"type":      "Event",
		"sessionId": sessionID,
		"eventId":   eventID,
		"event":     eventName,
		"data":      eventData,
	}, res)

	// test heartbeat
	err = guestWs.WriteMessage(websocket.TextMessage, []byte("h"))
	require.Nil(t, err)

	mt, resb, err := guestWs.ReadMessage()
	require.Nil(t, err)
	require.Equal(t, websocket.TextMessage, mt)
	require.Equal(t, []byte("h"), resb)
}

func toStringAnyMap(m map[string]string) map[string]interface{} {
	mm := map[string]interface{}{}
	for k, v := range m {
		mm[k] = v
	}
	return mm
}

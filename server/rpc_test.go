// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

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

	testSrvURL := strings.Replace(testSrv.URL, "http", "ws", 1) + "/rpc"
	ws, _, err := websocket.DefaultDialer.Dial(testSrvURL, nil)
	assert.Nil(t, err)
	defer ws.Close()

	err = ws.WriteMessage(websocket.TextMessage, []byte("hello"))
	assert.Nil(t, err)

	rcvdMsgType, rcvdMsg, err := ws.ReadMessage()
	assert.Nil(t, err)
	assert.Equal(t, websocket.TextMessage, rcvdMsgType)
	assert.Equal(t, []byte("hello"), rcvdMsg)
}

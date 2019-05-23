// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"log"
	"net/http"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
)

const (
	websocketReadLimit = 1024 * 1024
	handshaketimeout   = time.Second * 30
)

// rpcHandler deals with rpc methods over RPC.
// HTTP -> WS upgrades are also handled here.
// It includes a heartbeat mechanism to determine if a connection is alive or not
func (srv *Server) rpcHandler(w http.ResponseWriter, r *http.Request) {
	upgrader := &websocket.Upgrader{HandshakeTimeout: handshaketimeout}

	// CORS
	if len(srv.allowedOrigins) > 0 {
		upgrader.CheckOrigin = func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if len(origin) == 0 {
				return true
			}
			return srv.allowedOrigins.Contains(origin)
		}
	}

	// WS upgrade
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "websocket upgrade failed"))
		return
	}
	defer ws.Close()
	ws.SetReadLimit(websocketReadLimit)

	sendCh := make(chan interface{})
	defer close(sendCh)

	// Receive internal messages and write them to the websocket
	// associated with the original http requester
	go func() {
		for {
			res, ok := <-sendCh
			if !ok {
				return
			}

			// check for heartbeat response
			if v, ok := res.(rune); ok && v == 'h' {
				ws.WriteMessage(websocket.TextMessage, []byte("h"))
				continue
			}

			// write to ws
			if err := ws.WriteJSON(res); err != nil {
				log.Println(errors.Wrap(err, "websocket write failed"))
				ws.Close()
				return
			}
		}
	}()

	handler, err := rpc.NewMessageHandler(
		sendCh,
		srv.store,
		srv.pubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "message handler creation failed"))
		return
	}

	defer handler.Close()

	// read messages from websocket and handle them
	for {
		msgType, msgData, err := ws.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err) &&
				!websocket.IsUnexpectedCloseError(err) {
				log.Println(errors.Wrap(err, "websocket read failed"))
			}
			break
		}

		if msgType != websocket.TextMessage && msgType != websocket.BinaryMessage {
			continue
		}

		if err := handler.HandleRawMessage(msgData); err != nil {
			log.Println(err)
			break
		}
	}
}

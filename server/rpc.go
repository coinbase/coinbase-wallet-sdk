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

var upgrader = websocket.Upgrader{
	HandshakeTimeout: time.Second * 30,
}

func (srv *Server) rpcHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer ws.Close()

	handler, err := rpc.NewMessageHandler(
		ws.WriteJSON,
		srv.store,
		srv.hostPubSub,
		srv.guestPubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "host connection creation failed"))
		return
	}

	defer handler.CleanUp()

	for {
		rpcMsg := &rpc.Request{}
		err := ws.ReadJSON(rpcMsg)
		if err != nil {
			if !websocket.IsCloseError(err) &&
				!websocket.IsUnexpectedCloseError(err) {
				log.Println(errors.Wrap(err, "read message failed"))
			}
			break
		}

		if err := handler.Handle(rpcMsg); err != nil {
			log.Println(errors.Wrap(err, "handle message failed"))
			break
		}
	}
}

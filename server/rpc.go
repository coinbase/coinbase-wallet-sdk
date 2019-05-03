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

func (srv *Server) rpcHostHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer ws.Close()

	hostConn, err := rpc.NewHostConnection(
		ws.WriteJSON,
		srv.store,
		srv.hostPubSub,
		srv.guestPubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "host connection creation failed"))
		return
	}

	defer hostConn.CleanUp()

	handleMessages(hostConn, ws)
}

func (srv *Server) rpcGuestHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer ws.Close()

	guestConn, err := rpc.NewGuestConnection(
		ws.WriteJSON,
		srv.store,
		srv.hostPubSub,
		srv.guestPubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "guest connection creation failed"))
		return
	}

	defer guestConn.CleanUp()

	handleMessages(guestConn, ws)
}

func handleMessages(rpcConn rpc.Connection, ws *websocket.Conn) {
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

		if err := rpcConn.HandleMessage(rpcMsg); err != nil {
			log.Println(errors.Wrap(err, "handle message failed"))
			break
		}
	}
}

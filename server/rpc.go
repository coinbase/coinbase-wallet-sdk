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

	sendCh := make(chan interface{})
	defer close(sendCh)

	go func() {
		for {
			res, ok := <-sendCh
			if !ok {
				return
			}
			if err := ws.WriteJSON(res); err != nil {
				log.Println(errors.Wrap(err, "write failed"))
			}
		}
	}()

	handler, err := rpc.NewMessageHandler(
		sendCh,
		srv.store,
		srv.pubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "host connection creation failed"))
		return
	}

	defer handler.Close()

	for {
		rpcMsg := &rpc.Request{}
		err := ws.ReadJSON(rpcMsg)
		if err != nil {
			if !websocket.IsCloseError(err) &&
				!websocket.IsUnexpectedCloseError(err) {
				log.Println(errors.Wrap(err, "read failed"))
			}
			break
		}

		if err := handler.Handle(rpcMsg); err != nil {
			log.Println(errors.Wrap(err, "message handling failed"))
			break
		}
	}
}

// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package server

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
)

var upgrader = websocket.Upgrader{
	HandshakeTimeout: time.Second * 30,
}

func (srv *Server) rpcHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer conn.Close()

	rpcConnection, err := NewRPCConnection(srv.store)
	if err != nil {
		log.Println(errors.Wrap(err, "rpc connection creation failed"))
		return
	}

	for {
		rpcMsg := &RPCRequest{}
		err := conn.ReadJSON(rpcMsg)
		if err != nil {
			if !websocket.IsCloseError(err) &&
				!websocket.IsUnexpectedCloseError(err) {
				log.Println(errors.Wrap(err, "read message failed"))
			}
			break
		}

		res, err := rpcConnection.HandleMessage(rpcMsg)
		if err != nil {
			log.Println(errors.Wrap(err, "handle message failed"))
			break
		}
		if res != nil {
			if err = conn.WriteJSON(res); err != nil {
				log.Println(errors.Wrap(err, "write json failed"))
			}
		}
	}
}

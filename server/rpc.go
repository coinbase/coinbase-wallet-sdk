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

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(errors.Wrap(err, "read message failed"))
			break
		}

		shouldBreak := false

		switch msgType {
		case websocket.TextMessage:
			fallthrough
		case websocket.BinaryMessage:
			if err := conn.WriteMessage(msgType, msg); err != nil {
				log.Println(errors.Wrap(err, "Write failed"))
				shouldBreak = true
			}

		case websocket.PingMessage:
			if err := conn.WriteMessage(websocket.PongMessage, nil); err != nil {
				log.Println(errors.Wrap(err, "Pong failed"))
				shouldBreak = true
			}
		}

		if shouldBreak {
			break
		}
	}
}

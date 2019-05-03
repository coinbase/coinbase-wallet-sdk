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

func (srv *Server) rpcAgentHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer ws.Close()

	agentConn, err := rpc.NewAgentConnection(
		ws.WriteJSON,
		srv.store,
		srv.agentPubSub,
		srv.signerPubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "agent connection creation failed"))
		return
	}

	defer agentConn.CleanUp()

	handleMessages(agentConn, ws)
}

func (srv *Server) rpcSignerHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer ws.Close()

	signerConn, err := rpc.NewSignerConnection(
		ws.WriteJSON,
		srv.store,
		srv.agentPubSub,
		srv.signerPubSub,
	)
	if err != nil {
		log.Println(errors.Wrap(err, "signer connection creation failed"))
		return
	}

	defer signerConn.CleanUp()

	handleMessages(signerConn, ws)
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

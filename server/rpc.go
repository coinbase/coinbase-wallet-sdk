// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"log"
	"net/http"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
)

var upgrader = websocket.Upgrader{
	HandshakeTimeout: time.Second * 30,
}

func (srv *Server) rpcHandler(
	w http.ResponseWriter,
	r *http.Request,
	connectionConstructor rpc.ConnectionConstructor,
) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(errors.Wrap(err, "upgrade failed"))
		return
	}
	defer conn.Close()

	rpcConn, err := connectionConstructor(srv.store, conn.WriteJSON)
	if err != nil {
		log.Println(errors.Wrap(err, "rpc connection creation failed"))
		return
	}

	for {
		rpcMsg := &rpc.Request{}
		err := conn.ReadJSON(rpcMsg)
		if err != nil {
			if !websocket.IsCloseError(err) &&
				!websocket.IsUnexpectedCloseError(err) {
				log.Println(errors.Wrap(err, "read message failed"))
			}
			break
		}

		res, err := rpcConn.HandleMessage(rpcMsg)
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

func (srv *Server) rpcAgentHandler(w http.ResponseWriter, r *http.Request) {
	srv.rpcHandler(
		w,
		r,
		func(
			s store.Store,
			sendMessage rpc.SendMessageFunc,
		) (rpc.Connection, error) {
			return rpc.NewAgentConnection(s, sendMessage)
		},
	)
}

func (srv *Server) rpcSignerHandler(w http.ResponseWriter, r *http.Request) {
	srv.rpcHandler(
		w,
		r,
		func(
			s store.Store,
			sendMessage rpc.SendMessageFunc,
		) (rpc.Connection, error) {
			return rpc.NewSignerConnection(s, sendMessage)
		},
	)
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/config"
	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/gorilla/mux"
)

// Server - server
type Server struct {
	router *mux.Router
	store  store.Store
	pubSub *rpc.PubSub
}

// NewServer - construct a Server
func NewServer() *Server {
	router := mux.NewRouter()

	var s store.Store
	if len(config.PostgresURL) == 0 || config.AppEnv == config.AppEnvTest {
		s = store.NewMemoryStore()
	} else {
		var err error
		s, err = store.NewPostgresStore(config.PostgresURL, "store")
		if err != nil {
			panic(err)
		}
	}

	srv := &Server{
		router: router,
		store:  s,
		pubSub: rpc.NewPubSub(),
	}

	router.HandleFunc("/rpc", srv.rpcHandler).Methods("GET")
	router.HandleFunc("/events/{id}", srv.getEventHandler).Methods("GET")
	router.HandleFunc("/", srv.rootHandler).Methods("GET")

	return srv
}

// Start - start the server
func (s *Server) Start(port string) {
	httpServer := &http.Server{
		Addr: fmt.Sprintf("0.0.0.0:%s", port),
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 30,
		IdleTimeout:  time.Second * 60,
		Handler:      s.router,
	}
	log.Fatal(httpServer.ListenAndServe())
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

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
func NewServer(postgresURL string, webRoot string) *Server {
	router := mux.NewRouter()

	var s store.Store
	if len(postgresURL) == 0 {
		s = store.NewMemoryStore()
	} else {
		var err error
		s, err = store.NewPostgresStore(postgresURL, "store")
		if err != nil {
			log.Panicln(err)
		}
	}

	srv := &Server{
		router: router,
		store:  s,
		pubSub: rpc.NewPubSub(),
	}

	router.HandleFunc("/rpc", srv.rpcHandler).Methods("GET")
	router.HandleFunc("/events/{id}", srv.getEventHandler).Methods("GET")
	if len(webRoot) > 0 {
		router.PathPrefix("/").Methods("GET").Handler(
			http.FileServer(http.Dir(webRoot)),
		)
	}

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

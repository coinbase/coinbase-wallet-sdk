// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/gorilla/mux"
)

// Server - server
type Server struct {
	router         *mux.Router
	store          store.Store
	pubSub         *rpc.PubSub
	allowedOrigins util.StringSet
}

// NewServerOptions - options for NewServer function
type NewServerOptions struct {
	PostgresURL    string
	WebRoot        string
	AllowedOrigins util.StringSet
}

// NewServer - construct a Server
func NewServer(options *NewServerOptions) *Server {
	if options == nil {
		options = &NewServerOptions{}
	}

	var s store.Store
	if len(options.PostgresURL) == 0 {
		s = store.NewMemoryStore()
	} else {
		var err error
		s, err = store.NewPostgresStore(options.PostgresURL, "store")
		if err != nil {
			log.Panicln(err)
		}
	}

	router := mux.NewRouter()

	srv := &Server{
		router:         router,
		store:          s,
		pubSub:         rpc.NewPubSub(),
		allowedOrigins: options.AllowedOrigins,
	}

	router.HandleFunc("/rpc", srv.rpcHandler).Methods("GET")
	router.HandleFunc("/events/{id}", srv.getEventHandler).Methods("GET")

	if len(options.WebRoot) > 0 {
		router.PathPrefix("/").Methods("GET").Handler(
			http.FileServer(http.Dir(options.WebRoot)),
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

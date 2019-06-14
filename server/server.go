// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/CoinbaseWallet/walletlinkd/webhook"
	"github.com/gorilla/mux"
)

// Server - server
type Server struct {
	router         *mux.Router
	store          store.Store
	pubSub         *rpc.PubSub
	allowedOrigins util.StringSet
	webhook        webhook.Caller
	serverURL      string
}

// NewServerOptions - options for NewServer function
type NewServerOptions struct {
	Store          store.Store
	WebRoot        string
	AllowedOrigins util.StringSet
	Webhook        webhook.Caller
	ServerURL      string
	ForceSSL       bool
}

// NewServer - construct a Server
func NewServer(options *NewServerOptions) *Server {
	if options == nil {
		options = &NewServerOptions{}
	}

	st := options.Store
	if st == nil {
		st = store.NewMemoryStore()
	}

	router := mux.NewRouter()

	srv := &Server{
		router:         router,
		store:          st,
		pubSub:         rpc.NewPubSub(),
		allowedOrigins: options.AllowedOrigins,
		webhook:        options.Webhook,
		serverURL:      options.ServerURL,
	}

	if options.ForceSSL {
		router.Use(srv.forceSSL)
	}

	router.HandleFunc("/rpc", srv.rpcHandler).Methods("GET")
	router.HandleFunc("/events", srv.getEventsSinceHandler).Methods("GET")
	router.HandleFunc("/events/{id}", srv.getEventByIDHandler).Methods("GET")
	router.HandleFunc("/events/{id}/seen", srv.markEventSeenHandler).Methods("POST")

	if len(options.WebRoot) > 0 {
		router.PathPrefix("/").Methods("GET").Handler(
			http.FileServer(http.Dir(options.WebRoot)),
		)
	}

	return srv
}

// Start - start the server
func (s *Server) Start(port uint) {
	httpServer := &http.Server{
		Addr: fmt.Sprintf("0.0.0.0:%d", port),
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 30,
		IdleTimeout:  time.Second * 60,
		Handler:      s.router,
	}
	log.Fatal(httpServer.ListenAndServe())
}

func (s *Server) forceSSL(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Scheme != "https" && r.Header.Get("X-Forwarded-Proto") != "https" {
			if r.Method != http.MethodGet {
				w.WriteHeader(403)
				return
			}

			u, _ := url.Parse(s.serverURL)
			u.Scheme = "https"
			u.Path = r.URL.Path
			u.RawQuery = r.URL.RawQuery

			http.Redirect(w, r, u.String(), 301)
			return
		}
		next.ServeHTTP(w, r)
	})
}

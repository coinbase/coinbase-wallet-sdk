// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package server

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/walletlink/walletlink/server/rpc"
	"github.com/walletlink/walletlink/store"
	"github.com/walletlink/walletlink/util"
	"github.com/walletlink/walletlink/webhook"
)

// Server - server
type Server struct {
	router         *mux.Router
	store          store.Store
	pubSub         *rpc.PubSub
	allowedOrigins util.StringSet
	webhook        webhook.Caller
	serverURL      string
	readDeadline   time.Duration

	activeConnNum     int
	activeConnNumLock *sync.Mutex
}

// NewServerOptions - options for NewServer function
type NewServerOptions struct {
	Store          store.Store
	WebRoot        string
	AllowedOrigins util.StringSet
	Webhook        webhook.Caller
	ServerURL      string
	ForceSSL       bool
	ReadDeadline   time.Duration
}

const (
	activeConnsThreshold = 5000
)

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
		router:            router,
		store:             st,
		pubSub:            rpc.NewPubSub(),
		allowedOrigins:    options.AllowedOrigins,
		webhook:           options.Webhook,
		serverURL:         options.ServerURL,
		readDeadline:      options.ReadDeadline,
		activeConnNum:     0,
		activeConnNumLock: &sync.Mutex{},
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

	go func() {
		ticker := time.NewTicker(5 * time.Minute)

		for {
			select {
			case <-ticker.C:
				files := map[string]time.Time{}

				fdpath := filepath.Join("/proc", strconv.Itoa(os.Getpid()), "fd")
				ffiles, err := ioutil.ReadDir(fdpath)
				if err != nil {
					log.Printf("Failed to read /proc :%v", err)
					continue
				}

				for _, f := range ffiles {
					if f.Name() == "0" || f.Name() == "1" || f.Name() == "2" {
						continue
					}

					fpath, err := os.Readlink(filepath.Join(fdpath, f.Name()))
					if err != nil {
						continue
					}

					files[fpath] = f.ModTime()
				}

				log.Printf("Number of active conns: %d", len(files))

				if len(files) > activeConnsThreshold {
					fmt.Println("Restarting due to too many active conns")
					os.Exit(1)
				}
			}
		}
	}()

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

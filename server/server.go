// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// Server - server
type Server struct {
	router *mux.Router
}

// NewServer - construct a Server
func NewServer() *Server {
	router := mux.NewRouter()
	srv := &Server{router: router}

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

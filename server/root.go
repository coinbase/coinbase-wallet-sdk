// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import "net/http"

func (srv *Server) rootHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(200)
	w.Write([]byte(`{"status":"ok"}`))
}

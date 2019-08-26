// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package server

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/walletlink/walletlink/store/models"
)

type markEventSeenResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func (srv *Server) markEventSeenHandler(
	w http.ResponseWriter, r *http.Request,
) {
	eventID := mux.Vars(r)["id"]

	session, statusCode, err := srv.getSessionByBasicAuth(r)
	if err != nil {
		writeResponse(w, statusCode, &markEventSeenResponse{Error: err.Error()})
		return
	}

	if _, err = models.MarkEventSeen(srv.store, session.ID, eventID); err != nil {
		writeResponse(w, 500, &markEventSeenResponse{
			Error: responseErrorInternalError,
		})
		return
	}

	writeResponse(w, 200, &markEventSeenResponse{Success: true})
}

// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package server

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/walletlink/walletlink/store/models"
)

const getEventResponseErrorEventNotFound = "event not found"

type getEventError struct {
	statusCode  int
	description string
}

type getEventResponse struct {
	Event *models.Event `json:"event,omitempty"`
	Error string        `json:"error,omitempty"`
}

func (srv *Server) getEventByIDHandler(w http.ResponseWriter, r *http.Request) {
	eventID := mux.Vars(r)["id"]

	session, statusCode, err := srv.getSessionByBasicAuth(r)
	if err != nil {
		writeResponse(w, statusCode, &getEventResponse{Error: err.Error()})
		return
	}

	event, err := models.LoadEvent(srv.store, session.ID, eventID)
	if err != nil {
		writeResponse(w, 500, &getEventResponse{
			Error: responseErrorInternalError,
		})
		return
	}

	if event == nil {
		writeResponse(w, 404, &getEventResponse{
			Error: getEventResponseErrorEventNotFound,
		})
		return
	}

	writeResponse(w, 200, &getEventResponse{Event: event})
}

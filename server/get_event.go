// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
)

const (
	getEventResponseErrorInvalidSessionCredentials = "invalid session credentials"
	getEventResponseErrorInternalError             = "internal error"
	getEventResponseErrorEventNotFound             = "event not found"
)

type getEventResponse struct {
	Event *models.Event `json:"event,omitempty"`
	Error string        `json:"error,omitempty"`
}

// getEventHandler allows for an authenticated session participant to fetch a previously
// published event.
func (srv *Server) getEventHandler(w http.ResponseWriter, r *http.Request) {
	eventID := mux.Vars(r)["id"]

	sessionID, sessionKey, ok := r.BasicAuth()
	if !ok {
		writeGetEventResponse(w, 401, &getEventResponse{
			Error: getEventResponseErrorInvalidSessionCredentials,
		})
		return
	}

	session, err := models.LoadSession(srv.store, sessionID)
	if err != nil {
		writeGetEventResponse(w, 500, &getEventResponse{
			Error: getEventResponseErrorInternalError,
		})
		return
	}

	if session == nil || session.Key != sessionKey {
		writeGetEventResponse(w, 401, &getEventResponse{
			Error: getEventResponseErrorInvalidSessionCredentials,
		})
		return
	}

	event, err := models.LoadEvent(srv.store, sessionID, eventID)
	if err != nil {
		writeGetEventResponse(w, 500, &getEventResponse{
			Error: getEventResponseErrorInternalError,
		})
		return
	}

	if event == nil {
		writeGetEventResponse(w, 404, &getEventResponse{
			Error: getEventResponseErrorEventNotFound,
		})
		return
	}

	writeGetEventResponse(w, 200, &getEventResponse{Event: event})
}

func writeGetEventResponse(
	w http.ResponseWriter,
	statusCode int,
	response *getEventResponse,
) {
	if statusCode == 401 {
		w.Header().Set("WWW-Authenticate", `Basic realm="walletlinkd"`)
	}
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		fmt.Println(errors.Wrap(err, "failed to write response json"))
	}
}

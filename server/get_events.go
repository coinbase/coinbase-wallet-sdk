// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"net/http"
	"strconv"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/store/models"
)

type getEventsResponse struct {
	Timestamp int64          `json:"timestamp,omitempty"`
	Events    []models.Event `json:"events,omitempty"`
	Error     string         `json:"error,omitempty"`
}

func (srv *Server) getEventsSinceHandler(
	w http.ResponseWriter, r *http.Request,
) {
	session, statusCode, err := srv.getSessionByBasicAuth(r)
	if err != nil {
		writeResponse(w, statusCode, &getEventsResponse{Error: err.Error()})
		return
	}

	query := r.URL.Query()

	seconds := int64(0)
	timestamps, ok := query["timestamp"]
	if ok && len(timestamps) > 0 {
		seconds, _ = strconv.ParseInt(timestamps[0], 10, 64)
	}

	unseen := false
	unseens, ok := query["unseen"]
	if ok && len(unseens) > 0 {
		unseen, _ = strconv.ParseBool(unseens[0])
	}

	events, err := models.LoadEventsForSession(
		srv.store, seconds, unseen, session.ID,
	)
	if err != nil {
		writeResponse(w, 500, &getEventsResponse{Error: responseErrorInternalError})
		return
	}

	writeResponse(w, 200, &getEventsResponse{
		Timestamp: time.Now().Unix(),
		Events:    events,
	})
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/pkg/errors"
)

const (
	responseErrorInvalidSessionCredentials = "invalid session credentials"
	responseErrorInternalError             = "internal error"
)

func (srv *Server) getSessionByBasicAuth(
	r *http.Request,
) (session *models.Session, statusCode int, err error) {
	sessionID, sessionKey, ok := r.BasicAuth()
	if !ok {
		return nil, 401, errors.New(responseErrorInvalidSessionCredentials)
	}

	session, err = models.LoadSession(srv.store, sessionID)
	if err != nil {
		return nil, 500, errors.New(responseErrorInternalError)
	}

	if session == nil || session.Key != sessionKey {
		return nil, 401, errors.New(responseErrorInvalidSessionCredentials)
	}

	return session, 200, nil
}

func writeResponse(
	w http.ResponseWriter,
	statusCode int,
	response interface{},
) {
	if statusCode == 401 {
		w.Header().Set("WWW-Authenticate", `Basic realm="walletlinkd"`)
	}
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		fmt.Println(errors.Wrap(err, "failed to write response json"))
	}
}

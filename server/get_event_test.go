// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/walletlink/walletlink/store/models"
)

func TestGetEventNoSession(t *testing.T) {
	srv := NewServer(nil)

	req, err := http.NewRequest("GET", "/events/123", nil)
	require.Nil(t, err)

	sessionID := "456"
	sessionKey := "789"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := getEventResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.Nil(t, body.Event)
}

func TestGetEventInvalidSessionKey(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "456"

	s := models.Session{ID: sessionID, Key: "correctKey"}
	s.Save(srv.store)

	req, err := http.NewRequest("GET", "/events/123", nil)
	require.Nil(t, err)

	sessionKey := "incorrectKey"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := getEventResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.Nil(t, body.Event)
}

func TestGetEventNoEvent(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	req, err := http.NewRequest("GET", "/events/789", nil)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 404, resp.StatusCode)

	body := getEventResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, getEventResponseErrorEventNotFound, body.Error)
	require.Nil(t, body.Event)
}

func TestGetEvent(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"
	eventID := "789"

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	name := "name"
	data := "data"
	e := models.Event{ID: eventID, Event: name, Data: data}
	err = e.Save(srv.store, sessionID)
	require.Nil(t, err)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("/events/%s", eventID),
		nil,
	)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := getEventResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.Equal(t, name, body.Event.Event)
	require.Equal(t, data, body.Event.Data)
}

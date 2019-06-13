// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/store/models"
	"github.com/stretchr/testify/require"
)

func TestGetEventsNoSession(t *testing.T) {
	srv := NewServer(nil)

	req, err := http.NewRequest("GET", "/events?timestamp=1559952410", nil)
	require.Nil(t, err)

	sessionID := "456"
	sessionKey := "789"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.Nil(t, body.Events)
}

func TestGetEventsInvalidSessionKey(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "456"

	s := models.Session{ID: sessionID, Key: "correctKey"}
	s.Save(srv.store)

	req, err := http.NewRequest("GET", "/events?timestamp=1559952410", nil)
	require.Nil(t, err)

	sessionKey := "incorrectKey"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.Nil(t, body.Events)
}

func TestGetEventsNoEvent(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	req, err := http.NewRequest("GET", "/events?timestamp=1559952410", nil)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.Len(t, body.Events, 0)
}

func TestGetEvents(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"
	timestamp := time.Now().Unix() - 1

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	name := "name"
	data := "data"

	e1 := models.Event{ID: "abc", Event: name, Data: data}
	err = e1.Save(srv.store, sessionID)
	require.Nil(t, err)

	e2 := models.Event{ID: "def", Event: name, Data: data}
	err = e2.Save(srv.store, sessionID)
	require.Nil(t, err)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("/events?timestamp=%d", timestamp),
		nil,
	)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.Len(t, body.Events, 2)
	require.Contains(t, body.Events, e1)
	require.Contains(t, body.Events, e2)
}

func TestGetEventsBadTimestamp(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	name := "name"
	data := "data"

	e1 := models.Event{ID: "abc", Event: name, Data: data}
	err = e1.Save(srv.store, sessionID)
	require.Nil(t, err)

	e2 := models.Event{ID: "def", Event: name, Data: data}
	err = e2.Save(srv.store, sessionID)
	require.Nil(t, err)

	req, err := http.NewRequest(
		"GET",
		"/events?timestamp=abdasd",
		nil,
	)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.Len(t, body.Events, 2)
	require.Contains(t, body.Events, e1)
	require.Contains(t, body.Events, e2)
}

func TestGetEventsUnseen(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "123"
	sessionKey := "456"
	timestamp := time.Now().Unix() - 1

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	name := "name"
	data := "data"

	e1 := models.Event{ID: "abc", Event: name, Data: data}
	err = e1.Save(srv.store, sessionID)
	require.Nil(t, err)

	updated, err := models.MarkEventSeen(srv.store, sessionID, "abc")
	require.True(t, updated)
	require.Nil(t, err)

	e2 := models.Event{ID: "def", Event: name, Data: data}
	err = e2.Save(srv.store, sessionID)
	require.Nil(t, err)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("/events?timestamp=%d&unseen=true", timestamp),
		nil,
	)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := getEventsResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.Len(t, body.Events, 1)
	require.Contains(t, body.Events, e2)
}

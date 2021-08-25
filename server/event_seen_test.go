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

	"github.com/walletlink/walletlink/store"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/walletlink/walletlink/store/models"
)

type MockStore struct {
	*store.MemoryStore
	mock.Mock
}

func (ms *MockStore) MarkSeen(key string) (updated bool, err error) {
	args := ms.Called(key)
	return args.Bool(0), args.Error(1)
}

func TestMarkEventSeenNoSession(t *testing.T) {
	srv := NewServer(nil)

	req, err := http.NewRequest("POST", "/events/123/seen", nil)
	require.Nil(t, err)

	sessionID := "456"
	sessionKey := "789"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := markEventSeenResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.False(t, body.Success)
}

func TestMarkEventSeenInvalidSessionKey(t *testing.T) {
	srv := NewServer(nil)
	sessionID := "456"

	s := models.Session{ID: sessionID, Key: "correctKey"}
	s.Save(srv.store)

	req, err := http.NewRequest("POST", "/events/123/seen", nil)
	require.Nil(t, err)

	sessionKey := "incorrectKey"
	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 401, resp.StatusCode)

	body := markEventSeenResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Equal(t, responseErrorInvalidSessionCredentials, body.Error)
	require.False(t, body.Success)
}

func TestMarkEventSeenNoEvent(t *testing.T) {
	mockStore := &MockStore{MemoryStore: store.NewMemoryStore()}
	mockStore.On("MarkSeen", mock.Anything).Return(false, nil)

	srv := NewServer(&NewServerOptions{Store: mockStore})
	sessionID := "123"
	sessionKey := "456"

	s := models.Session{ID: sessionID, Key: sessionKey}
	err := s.Save(srv.store)
	require.Nil(t, err)

	req, err := http.NewRequest("POST", "/events/789/seen", nil)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := markEventSeenResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.True(t, body.Success)

	mockStore.AssertCalled(t, "MarkSeen", "session:123:event:789")
	mockStore.AssertNumberOfCalls(t, "MarkSeen", 1)
}

func TestMarkEventSeen(t *testing.T) {
	mockStore := &MockStore{MemoryStore: store.NewMemoryStore()}
	mockStore.On("MarkSeen", mock.Anything).Return(true, nil)

	srv := NewServer(&NewServerOptions{Store: mockStore})
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
		"POST",
		fmt.Sprintf("/events/%s/seen", eventID),
		nil,
	)
	require.Nil(t, err)

	req.SetBasicAuth(sessionID, sessionKey)

	rr := httptest.NewRecorder()
	srv.router.ServeHTTP(rr, req)

	resp := rr.Result()
	require.Equal(t, 200, resp.StatusCode)

	body := markEventSeenResponse{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.Nil(t, err)
	require.Empty(t, body.Error)
	require.True(t, body.Success)

	mockStore.AssertCalled(t, "MarkSeen", "session:123:event:789")
	mockStore.AssertNumberOfCalls(t, "MarkSeen", 1)
}

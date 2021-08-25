// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package models

import (
	"fmt"

	"github.com/pkg/errors"
	"github.com/walletlink/walletlink/store"
)

// Event - event published by a host or guest
type Event struct {
	ID    string `json:"id"`
	Event string `json:"event"`
	Data  string `json:"data"`
}

// LoadEvent - load an event from the store. if an event with a given ID is
// not found in the store, (nil, nil) is returned
func LoadEvent(
	st store.Store,
	sessionID string,
	eventID string,
) (*Event, error) {
	e := &Event{}
	ok, err := st.Get(eventStoreKey(eventID, sessionID), e)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load event")
	}
	if !ok {
		return nil, nil
	}
	return e, nil
}

// LoadEventsForSession - load all events from the store for the session with
// the given ID. If unseen is true, only return events that have not been seen
func LoadEventsForSession(
	st store.Store, since int64, unseen bool, sessionID string,
) ([]Event, error) {
	e := []Event{}
	err := st.FindByPrefix(sessionKeyPrefix(sessionID), since, unseen, &e)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load events")
	}
	return e, nil
}

// MarkEventSeen - mark the event as seen
func MarkEventSeen(
	st store.Store, sessionID, eventID string,
) (updated bool, err error) {
	return st.MarkSeen(eventStoreKey(eventID, sessionID))
}

// Save - save event in the store
func (e *Event) Save(st store.Store, sessionID string) error {
	storeKey := eventStoreKey(e.ID, sessionID)
	if len(storeKey) == 0 {
		return errors.New("event ID or session ID is not set")
	}
	if err := st.Set(storeKey, e); err != nil {
		return errors.Wrap(err, "failed to save event")
	}
	return nil
}

func eventStoreKey(eventID string, sessionID string) string {
	if len(eventID) == 0 || len(sessionID) == 0 {
		return ""
	}
	return fmt.Sprintf("%s%s", sessionKeyPrefix(sessionID), eventID)
}

func sessionKeyPrefix(sessionID string) string {
	return fmt.Sprintf("session:%s:event:", sessionID)
}

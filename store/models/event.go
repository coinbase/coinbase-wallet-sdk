// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package models

import (
	"fmt"

	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/pkg/errors"
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
	return fmt.Sprintf("session:%s:event:%s", sessionID, eventID)
}

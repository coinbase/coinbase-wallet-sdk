// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package store

import (
	"encoding/json"
	"sync"

	"github.com/pkg/errors"
)

// MemoryStore - in-memory store
type MemoryStore struct {
	lock sync.Mutex
	db   map[string][]byte
}

var _ Store = (*MemoryStore)(nil)

// NewMemoryStore - construct a MemoryStore
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		db: map[string][]byte{},
	}
}

// Set - save data under a given key
func (ms *MemoryStore) Set(key string, value interface{}) error {
	ms.lock.Lock()
	defer ms.lock.Unlock()

	j, err := json.Marshal(value)
	if err != nil {
		return errors.Wrap(err, "could not serialize value")
	}

	ms.db[key] = j
	return nil
}

// Get - load data for a given key. value passed must be a reference.
// (false, nil) is returned if key does not exist.
func (ms *MemoryStore) Get(key string, value interface{}) (bool, error) {
	ms.lock.Lock()
	defer ms.lock.Unlock()

	j, ok := ms.db[key]
	if !ok {
		return false, nil
	}

	if err := json.Unmarshal(j, value); err != nil {
		return false, errors.Wrap(err, "could not deserialize value")
	}

	return true, nil
}

// Remove - remove a key. does not return an error if key does not exist
func (ms *MemoryStore) Remove(key string) error {
	ms.lock.Lock()
	defer ms.lock.Unlock()

	delete(ms.db, key)
	return nil
}

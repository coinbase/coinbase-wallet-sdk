// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package store

import (
	"encoding/json"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"
)

// MemoryStore - in-memory store
type MemoryStore struct {
	lock sync.Mutex
	db   map[string]storeValue
}

type storeValue struct {
	value     []byte
	updatedAt int64
	seenAt    int64
}

var _ Store = (*MemoryStore)(nil)

// NewMemoryStore - construct a MemoryStore
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		db: map[string]storeValue{},
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

	ms.db[key] = storeValue{value: j, updatedAt: time.Now().Unix(), seenAt: 0}
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

	if err := json.Unmarshal(j.value, value); err != nil {
		return false, errors.Wrap(err, "could not deserialize value")
	}

	return true, nil
}

// FindByPrefix - load all values whose key starts with the given prefix that
// were updated after since. If unseen is true, only return values that have not
// been marked seen.
func (ms *MemoryStore) FindByPrefix(
	prefix string,
	since int64,
	unseen bool,
	values interface{},
) error {
	valuesValue := reflect.ValueOf(values)
	if valuesValue.Kind() != reflect.Ptr ||
		valuesValue.Elem().Kind() != reflect.Slice {
		return errors.New("values must be a pointer to a slice")
	}

	ms.lock.Lock()
	defer ms.lock.Unlock()

	sliceType := reflect.TypeOf(values).Elem()
	elemType := sliceType.Elem()

	vs := reflect.New(sliceType).Elem()

	for k, v := range ms.db {
		if !strings.HasPrefix(k, prefix) || v.updatedAt <= since ||
			(unseen && v.seenAt > 0) {
			continue
		}

		value := reflect.New(elemType).Interface()

		if err := json.Unmarshal(v.value, value); err != nil {
			continue
		}

		vs = reflect.Append(vs, reflect.ValueOf(value).Elem())
	}

	reflect.ValueOf(values).Elem().Set(vs)

	return nil
}

// MarkSeen - mark the value with the given key as seen
func (ms *MemoryStore) MarkSeen(key string) (updated bool, err error) {
	ms.lock.Lock()
	defer ms.lock.Unlock()

	v, ok := ms.db[key]
	if !ok {
		return false, nil
	}

	v.seenAt = time.Now().Unix()
	ms.db[key] = v

	return true, nil
}

// Remove - remove a key. does not return an error if key does not exist
func (ms *MemoryStore) Remove(key string) error {
	ms.lock.Lock()
	defer ms.lock.Unlock()

	delete(ms.db, key)
	return nil
}

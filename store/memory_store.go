// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package store

import (
	"sync"

	"github.com/CoinbaseWallet/walletlinkd/session"
	"github.com/pkg/errors"
)

// MemoryStore - in-memory store
type MemoryStore struct {
	sessionsLock sync.Mutex
	sessions     map[string]*session.Session
}

var _ Store = (*MemoryStore)(nil)

// NewMemoryStore - construct a MemoryStore
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		sessions: map[string]*session.Session{},
	}
}

// SaveSession - save session
func (ms *MemoryStore) SaveSession(sess *session.Session) error {
	if sess == nil {
		return errors.Errorf("session is nil")
	}
	ms.sessionsLock.Lock()
	defer ms.sessionsLock.Unlock()
	ms.sessions[sess.ID()] = sess
	return nil
}

// LoadSession - get session by id, returns (nil, nil) if not found
func (ms *MemoryStore) LoadSession(id string) (*session.Session, error) {
	if len(id) == 0 {
		return nil, errors.Errorf("id must not be empty")
	}

	ms.sessionsLock.Lock()
	defer ms.sessionsLock.Unlock()
	if sess, ok := ms.sessions[id]; ok {
		return sess, nil
	}

	return nil, nil
}

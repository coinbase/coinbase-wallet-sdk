// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package models

import (
	"sync"

	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/pkg/errors"
)

// Session - rpc session
type Session struct {
	ID           string            `json:"id"`
	Key          string            `json:"key"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	metadataLock sync.Mutex
}

// LoadSession - load session from the store. returns (nil, nil), if session
// with a given ID is not found in the store
func LoadSession(st store.Store, sessionID string) (*Session, error) {
	s := &Session{ID: sessionID}
	ok, err := st.Get(s.storeKey(), s)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load session")
	}
	if !ok {
		return nil, nil
	}
	return s, nil
}

// Save - save session in the store
func (s *Session) Save(st store.Store) error {
	storeKey := s.storeKey()
	if len(storeKey) == 0 {
		return errors.New("session ID is not set")
	}
	if err := st.Set(storeKey, s); err != nil {
		return errors.Wrap(err, "failed to save session")
	}
	return nil
}

// SetMetadata - sets a key-value data
func (s *Session) SetMetadata(key, value string) {
	s.metadataLock.Lock()
	defer s.metadataLock.Unlock()
	if s.Metadata == nil {
		s.Metadata = map[string]string{}
	}
	if value == "" {
		delete(s.Metadata, key)
		if len(s.Metadata) == 0 {
			s.Metadata = nil
		}
		return
	}
	s.Metadata[key] = value
}

// GetMetadata - gets a key-value data
func (s *Session) GetMetadata(key string) string {
	s.metadataLock.Lock()
	defer s.metadataLock.Unlock()
	return s.Metadata[key]
}

// IsValidSessionID - check validity of a given session ID
func IsValidSessionID(id string) bool {
	return len(id) == 32 && util.IsHexString(id)
}

// IsValidSessionKey - check validity of a given session key
func IsValidSessionKey(key string) bool {
	return len(key) == 64 && util.IsHexString(key)
}

// IsValidSessionMetadataKey - check validity of a metadata key
func IsValidSessionMetadataKey(metadataKey string) bool {
	lenMetadataKey := len(metadataKey)
	return lenMetadataKey > 0 && lenMetadataKey <= 100
}

// IsValidSessionMetadataValue - check validty of a metadata value
func IsValidSessionMetadataValue(metadataValue string) bool {
	lenMetadataValue := len(metadataValue)
	return lenMetadataValue > 0 && lenMetadataValue <= 1024
}

func (s *Session) storeKey() string {
	if len(s.ID) == 0 {
		return ""
	}
	return "session:" + s.ID
}

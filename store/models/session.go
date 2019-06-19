// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package models

import (
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/CoinbaseWallet/walletlinkd/util"
	"github.com/pkg/errors"
)

// Session - rpc session
type Session struct {
	ID         string            `json:"id"`
	Key        string            `json:"key"`
	Linked     bool              `json:"linked"`
	WebhookID  string            `json:"webhookId,omitempty"`
	WebhookURL string            `json:"webhookUrl,omitempty"`
	Metadata   map[string]string `json:"metadata,omitempty"`
}

// LoadSession - load a session from the store. if a session with a given ID is
// not found in the store, (nil, nil) is returned
func LoadSession(st store.Store, sessionID string) (*Session, error) {
	s := &Session{}
	ok, err := st.Get(sessionStoreKey(sessionID), s)
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
	storeKey := sessionStoreKey(s.ID)
	if len(storeKey) == 0 {
		return errors.New("session ID is not set")
	}
	if err := st.Set(storeKey, s); err != nil {
		return errors.Wrap(err, "failed to save session")
	}
	return nil
}

// IsValidSessionID - check validity of a given session ID
func IsValidSessionID(id string) bool {
	return len(id) == 32 && util.IsHexString(id)
}

// IsValidSessionKey - check validity of a given session key
func IsValidSessionKey(key string) bool {
	return len(key) == 64 && util.IsHexString(key)
}

// UpdateSessionConfig - update the session configuration
func (s *Session) UpdateSessionConfig(
	webhookID, webhookURL *string, metadata map[string]*string,
) error {
	if valid, invalidReason := isValidSessionConfig(
		webhookID,
		webhookURL,
		metadata,
	); !valid {
		return errors.New(invalidReason)
	}

	if webhookID != nil {
		s.WebhookID = *webhookID
	}

	if webhookURL != nil {
		s.WebhookURL = *webhookURL
	}

	if s.Metadata == nil {
		s.Metadata = map[string]string{}
	}

	for k, v := range metadata {
		if v != nil {
			s.Metadata[k] = *v
		} else {
			delete(s.Metadata, k)
		}
	}

	return nil
}

func isValidSessionConfig(
	webhookID *string,
	webhookURL *string,
	metadata map[string]*string,
) (valid bool, invalidReason string) {
	if webhookID != nil && len(*webhookID) > 100 {
		return false, "webhook ID can't be longer than 100 characters"
	}
	if webhookURL != nil && len(*webhookURL) > 200 {
		return false, "webhook URL can't be longer than 200 characters"
	}
	if len(metadata) > 50 {
		return false, "metadata can't contain more than 50 fields"
	}
	for k, v := range metadata {
		if len(k) == 0 {
			return false, "metadata field name can't be blank"
		}
		if len(k) > 100 {
			return false, "metadata field name can't be longer than 100 characters"
		}
		if v != nil && len(*v) > 1024 {
			return false, "metadata value can't be longer than 1024 characters"
		}
	}
	return true, ""
}

func sessionStoreKey(sessionID string) string {
	if len(sessionID) == 0 {
		return ""
	}
	return "session:" + sessionID
}

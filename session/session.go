// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package session

import (
	"regexp"

	"github.com/pkg/errors"
)

var hexStringRegex = regexp.MustCompile("^([a-f0-9]{2})+$")

// Session - rpc session
type Session struct {
	ID  string `json:"id"`
	Key string `json:"key"`
}

// NewSession - construct a session
func NewSession(id, key string) (*Session, error) {
	if !IsValidID(id) {
		return nil, errors.Errorf("invalid session ID")
	}
	if !IsValidKey(key) {
		return nil, errors.Errorf("invalid session key")
	}

	return &Session{ID: id, Key: key}, nil
}

// IsValidID - validate session id
func IsValidID(id string) bool {
	return len(id) == 32 && hexStringRegex.MatchString(id)
}

// IsValidKey - validate session key
func IsValidKey(key string) bool {
	return len(key) == 64 && hexStringRegex.MatchString(key)
}

// StoreKey - make key for session in the store
func StoreKey(id string) string {
	return "session:" + id
}

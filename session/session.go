// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package session

import (
	"regexp"

	"github.com/pkg/errors"
)

var hexStringRegex = regexp.MustCompile("^([a-f0-9]{2})+$")

// Session - rpc session
type Session struct {
	id  string
	key string
}

// NewSession - construct a session
func NewSession(id, key string) (*Session, error) {
	if !IsValidID(id) {
		return nil, errors.Errorf("invalid session ID")
	}

	return &Session{id: id, key: key}, nil
}

// ID - return ID
func (s *Session) ID() string {
	return s.id
}

// Key - return key
func (s *Session) Key() string {
	return s.key
}

// IsValidID - validate session id
func IsValidID(id string) bool {
	return len(id) == 32 && hexStringRegex.MatchString(id)
}

// IsValidKey - validate session key
func IsValidKey(key string) bool {
	return len(key) == 64 && hexStringRegex.MatchString(key)
}

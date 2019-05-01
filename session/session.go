// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package session

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"

	"github.com/pkg/errors"
)

var (
	sessionIDRegex = regexp.MustCompile("^[a-f0-9]{32}$")
)

// Session - rpc session
type Session struct {
	id    string
	nonce string
}

// NewSession - construct a session
func NewSession(id string) (*Session, error) {
	if !IsValidID(id) {
		return nil, errors.Errorf("invalid session ID")
	}

	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return nil, errors.Wrap(err, "could not generate random nonce")
	}
	nonce := hex.EncodeToString(b)

	return &Session{
		id:    id,
		nonce: nonce,
	}, nil
}

// ID - return ID
func (s *Session) ID() string {
	return s.id
}

// Nonce - return nonce
func (s *Session) Nonce() string {
	return s.nonce
}

// IsValidID - validate session id
func IsValidID(id string) bool {
	return sessionIDRegex.MatchString(id)
}

// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package session

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/pkg/errors"
)

// Session - rpc session
type Session struct {
	id    string
	nonce string
}

// NewSession - construct a session
func NewSession(id string) (*Session, error) {
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

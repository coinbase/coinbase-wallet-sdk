// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package session

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUniqueNonceGeneration(t *testing.T) {
	session1, err := NewSession("id1")
	assert.Nil(t, err)
	session2, err := NewSession("id2")
	assert.Nil(t, err)
	session3, err := NewSession("id3")
	assert.Nil(t, err)

	assert.NotEqual(t, session1.nonce, session2.nonce)
	assert.NotEqual(t, session1.nonce, session3.nonce)
	assert.NotEqual(t, session2.nonce, session3.nonce)
}

// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package store

import (
	"github.com/CoinbaseWallet/walletlinkd/session"
)

// Store - store interface
type Store interface {
	SaveSession(sess *session.Session) error
	LoadSession(id string) (*session.Session, error)
}

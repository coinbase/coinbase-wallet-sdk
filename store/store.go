// Copyright (c) 2017-2019 Coinbase Inc. See LICENSE

package store

import (
	"github.com/CoinbaseWallet/walletlinkd/session"
)

// Store - store interface
type Store interface {
	AddSession(sess *session.Session) error
	GetSession(id string) (*session.Session, error)
}

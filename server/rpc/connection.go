// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import "github.com/CoinbaseWallet/walletlinkd/store"

// Connection - common interface for rpc connections
type Connection interface {
	HandleMessage(msg *Request) (*Response, error)
}

// ConnectionConstructor .
type ConnectionConstructor func(sto store.Store) (Connection, error)

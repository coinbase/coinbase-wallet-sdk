// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import "github.com/CoinbaseWallet/walletlinkd/store"

// SendMessageFunc - callback function to send a message
type SendMessageFunc func(res interface{}) error

// Connection - common interface for rpc connections
type Connection interface {
	HandleMessage(msg *Request) (*Response, error)
}

// ConnectionConstructor - constructor function for connections
type ConnectionConstructor func(
	sto store.Store,
	sendMessage SendMessageFunc,
) (Connection, error)

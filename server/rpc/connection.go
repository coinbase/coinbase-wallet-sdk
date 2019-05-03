// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

// SendMessageFunc - callback function to send a message
type SendMessageFunc func(msg interface{}) error

// Connection - common interface for rpc connections
type Connection interface {
	SendMessage(msg interface{}) error
	HandleMessage(msg *Request) error
	CleanUp()
}

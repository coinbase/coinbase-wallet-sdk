// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"log"
	"sync"

	"github.com/pkg/errors"
)

type MessageSender interface {
	SendMessage(msg interface{}) error
}

type connectionSet = map[MessageSender]struct{}

// PubSub - pub/sub for connections
type PubSub struct {
	connMapLock sync.Mutex
	connMap     map[string]connectionSet
}

// NewPubSub - construct a PubSub
func NewPubSub() *PubSub {
	return &PubSub{
		connMap: map[string]connectionSet{},
	}
}

// Subscribe - subscribes a connection to an id
func (cm *PubSub) Subscribe(id string, connection MessageSender) {
	if id == "" || connection == nil {
		return
	}
	cm.connMapLock.Lock()
	defer cm.connMapLock.Unlock()

	set, ok := cm.connMap[id]
	if !ok {
		set = connectionSet{}
		cm.connMap[id] = set
	}

	set[connection] = struct{}{}
}

// Unsubscribe - unsubscribes a connection from an id
func (cm *PubSub) Unsubscribe(id string, connection MessageSender) {
	if id == "" || connection == nil {
		return
	}
	cm.connMapLock.Lock()
	defer cm.connMapLock.Unlock()

	set, ok := cm.connMap[id]
	if !ok {
		return
	}

	delete(set, connection)

	if len(set) == 0 {
		delete(cm.connMap, id)
	}
}

// UnsubscribeAll - unsubscribes all connections from an id
func (cm *PubSub) UnsubscribeAll(id string) {
	if id == "" {
		return
	}
	cm.connMapLock.Lock()
	defer cm.connMapLock.Unlock()

	delete(cm.connMap, id)
}

// Publish - publishes a message to connections that are subscribed to an id
func (cm *PubSub) Publish(id string, msg interface{}) {
	if id == "" {
		return
	}
	cm.connMapLock.Lock()
	defer cm.connMapLock.Unlock()

	connections, ok := cm.connMap[id]
	if !ok {
		return
	}

	for connection := range connections {
		connection := connection
		go func() {
			if err := connection.SendMessage(msg); err != nil {
				log.Println(errors.Wrap(err, "unable to send message"))
			}
		}()
	}
}

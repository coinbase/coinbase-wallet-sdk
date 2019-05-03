// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"log"
	"sync"

	"github.com/pkg/errors"
)

// MessageSender - interface with SendMessage method
type MessageSender interface {
	SendMessage(msg interface{}) error
}

type subscriberSet = map[MessageSender]struct{}

// PubSub - pub/sub interface for message senders
type PubSub struct {
	subMapLock sync.Mutex
	subMap     map[string]subscriberSet
}

// NewPubSub - construct a PubSub
func NewPubSub() *PubSub {
	return &PubSub{
		subMap: map[string]subscriberSet{},
	}
}

// Subscribe - subscribes a MessageSender to an id
func (cm *PubSub) Subscribe(id string, subscriber MessageSender) {
	if id == "" || subscriber == nil {
		return
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	set, ok := cm.subMap[id]
	if !ok {
		set = subscriberSet{}
		cm.subMap[id] = set
	}

	set[subscriber] = struct{}{}
}

// Unsubscribe - unsubscribes a MessageSender from an id
func (cm *PubSub) Unsubscribe(id string, subscriber MessageSender) {
	if id == "" || subscriber == nil {
		return
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	set, ok := cm.subMap[id]
	if !ok {
		return
	}

	delete(set, subscriber)

	if len(set) == 0 {
		delete(cm.subMap, id)
	}
}

// UnsubscribeAll - unsubscribes all MessageSenders from an id
func (cm *PubSub) UnsubscribeAll(id string) {
	if id == "" {
		return
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	delete(cm.subMap, id)
}

// Publish - publishes a message to all subscribers of an id
func (cm *PubSub) Publish(id string, msg interface{}) {
	if id == "" {
		return
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	subscribers, ok := cm.subMap[id]
	if !ok {
		return
	}

	for subscriber := range subscribers {
		subscriber := subscriber
		go func() {
			if err := subscriber.SendMessage(msg); err != nil {
				log.Println(errors.Wrap(err, "unable to send message"))
			}
		}()
	}
}

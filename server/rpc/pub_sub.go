// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"sync"
)

// Subscriber - channel that takes in any type
type Subscriber chan<- interface{}

type subscriberSet = map[Subscriber]struct{}

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

// Subscribe - subscribes a Subscriber to an id
func (cm *PubSub) Subscribe(id string, subscriber Subscriber) {
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

// Unsubscribe - unsubscribes a Subscriber from an id
func (cm *PubSub) Unsubscribe(id string, subscriber Subscriber) {
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

// UnsubscribeAll - unsubscribes all Subscribers from an id
func (cm *PubSub) UnsubscribeAll(id string) {
	if id == "" {
		return
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	delete(cm.subMap, id)
}

// Publish - publishes a message to all subscribers of an id and returns
// the number of subscribers messaged
func (cm *PubSub) Publish(id string, msg interface{}) int {
	if id == "" {
		return 0
	}
	cm.subMapLock.Lock()
	defer cm.subMapLock.Unlock()

	subscribers, ok := cm.subMap[id]
	if !ok {
		return 0
	}

	for subscriber := range subscribers {
		subscriber := subscriber
		go func() {
			subscriber <- msg
		}()
	}
	return len(subscribers)
}

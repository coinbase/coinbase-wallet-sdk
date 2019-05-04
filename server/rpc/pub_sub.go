// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"sync"
)

// Subscriber - channel that takes in any type
type Subscriber chan<- interface{}

type subscriberSet = map[Subscriber]struct{}
type idSet = map[string]struct{}

// PubSub - pub/sub interface for message senders
type PubSub struct {
	lock   sync.Mutex
	subMap map[string]subscriberSet
	idMap  map[Subscriber]idSet
}

// NewPubSub - construct a PubSub
func NewPubSub() *PubSub {
	return &PubSub{
		subMap: map[string]subscriberSet{},
		idMap:  map[Subscriber]idSet{},
	}
}

// Subscribe - subscribes a Subscriber to an id
func (cm *PubSub) Subscribe(id string, subscriber Subscriber) {
	if id == "" || subscriber == nil {
		return
	}
	cm.lock.Lock()
	defer cm.lock.Unlock()

	subscribers, ok := cm.subMap[id]
	if !ok {
		subscribers = subscriberSet{}
		cm.subMap[id] = subscribers
	}

	ids, ok := cm.idMap[subscriber]
	if !ok {
		ids = idSet{}
		cm.idMap[subscriber] = ids
	}

	subscribers[subscriber] = struct{}{}
	ids[id] = struct{}{}
}

// Unsubscribe - unsubscribes a Subscriber from an id
func (cm *PubSub) Unsubscribe(id string, subscriber Subscriber) {
	if id == "" || subscriber == nil {
		return
	}
	cm.lock.Lock()
	defer cm.lock.Unlock()

	cm.unsubscribeOne(id, subscriber)
}

// UnsubscribeAll - unsubscribes subscriber from every id and returns the number
// of unsubscriptions done
func (cm *PubSub) UnsubscribeAll(subscriber Subscriber) int {
	if subscriber == nil {
		return 0
	}
	cm.lock.Lock()
	defer cm.lock.Unlock()

	ids, ok := cm.idMap[subscriber]
	if !ok {
		return 0
	}

	for id := range ids {
		cm.unsubscribeOne(id, subscriber)
	}

	return len(ids)
}

// Publish - publishes a message to all subscribers of an id and returns
// the number of subscribers messaged
func (cm *PubSub) Publish(id string, msg interface{}) int {
	if id == "" {
		return 0
	}
	cm.lock.Lock()
	defer cm.lock.Unlock()

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

func (cm *PubSub) unsubscribeOne(id string, subscriber Subscriber) {
	set, ok := cm.subMap[id]
	if !ok {
		return
	}

	delete(set, subscriber)

	if len(set) == 0 {
		delete(cm.subMap, id)
	}
}

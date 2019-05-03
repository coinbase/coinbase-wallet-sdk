// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

type mockMsgSender struct {
	msgSent interface{}
}

var _ MessageSender = (*mockMsgSender)(nil)

func (mc *mockMsgSender) SendMessage(msg interface{}) error {
	mc.msgSent = msg
	return nil
}

func (mc *mockMsgSender) resetMsgSent() {
	mc.msgSent = nil
}

func TestPubSub(t *testing.T) {
	sub1 := &mockMsgSender{}
	sub2 := &mockMsgSender{}

	pubsub := NewPubSub()

	// publishing when nothing is subscribed does nothing
	pubsub.Publish("1", "hello")
	assert.Equal(t, sub1.msgSent, nil)
	assert.Equal(t, sub2.msgSent, nil)

	// subscribe sub1 to "1"
	pubsub.Subscribe("1", sub1)

	// publish "foo" to "1"
	pubsub.Publish("1", "foo")

	// wait a bit to let async processing finish
	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, "foo")
	assert.Equal(t, sub2.msgSent, nil)

	// subscribe sub2 to "1"
	pubsub.Subscribe("1", sub2)

	sub1.resetMsgSent()
	sub2.resetMsgSent()

	// publish "bar" to "1"
	pubsub.Publish("1", "bar")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, "bar")
	assert.Equal(t, sub2.msgSent, "bar")

	sub1.resetMsgSent()
	sub2.resetMsgSent()

	// subscribe sub1 to "2"
	pubsub.Subscribe("2", sub1)

	// publish "baz" to "2"
	pubsub.Publish("2", "baz")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, "baz")
	assert.Equal(t, sub2.msgSent, nil)

	sub1.resetMsgSent()
	sub2.resetMsgSent()

	// unsubscribe all subscribers of "2"
	pubsub.UnsubscribeAll("2")

	// publish "bazz" to "2"
	pubsub.Publish("2", "bazz")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, nil)
	assert.Equal(t, sub2.msgSent, nil)

	// unsubscribe sub1 from "1"
	pubsub.Unsubscribe("1", sub1)

	// publish "qux" to "1"
	pubsub.Publish("1", "qux")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, nil)
	assert.Equal(t, sub2.msgSent, "qux")

	sub1.resetMsgSent()
	sub2.resetMsgSent()

	// unsubscribe sub2 from "1"
	pubsub.Unsubscribe("1", sub2)

	// publish "quux" to "1"
	pubsub.Publish("1", "quux")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, sub1.msgSent, nil)
	assert.Equal(t, sub2.msgSent, nil)
}

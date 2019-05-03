// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

type mockConn struct {
	msgSent interface{}
}

var _ MessageSender = (*mockConn)(nil)

func (mc *mockConn) SendMessage(msg interface{}) error {
	mc.msgSent = msg
	return nil
}

func (mc *mockConn) resetMsgSent() {
	mc.msgSent = nil
}

func TestPubSub(t *testing.T) {
	conn1 := &mockConn{}
	conn2 := &mockConn{}

	pubsub := NewPubSub()

	// publishing when nothing is subscribed does nothing
	pubsub.Publish("1", "hello")
	assert.Equal(t, conn1.msgSent, nil)
	assert.Equal(t, conn2.msgSent, nil)

	// subscribe conn1 to "1"
	pubsub.Subscribe("1", conn1)

	// publish "foo" to "1"
	pubsub.Publish("1", "foo")

	// wait a bit to let async processing finish
	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, "foo")
	assert.Equal(t, conn2.msgSent, nil)

	// subscribe conn2 to "1"
	pubsub.Subscribe("1", conn2)

	conn1.resetMsgSent()
	conn2.resetMsgSent()

	// publish "bar" to "1"
	pubsub.Publish("1", "bar")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, "bar")
	assert.Equal(t, conn2.msgSent, "bar")

	conn1.resetMsgSent()
	conn2.resetMsgSent()

	// subscribe conn1 to "2"
	pubsub.Subscribe("2", conn1)

	// publish "baz" to "2"
	pubsub.Publish("2", "baz")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, "baz")
	assert.Equal(t, conn2.msgSent, nil)

	conn1.resetMsgSent()
	conn2.resetMsgSent()

	// unsubscribe all connections from "2"
	pubsub.UnsubscribeAll("2")

	// publish "bazz" to "2"
	pubsub.Publish("2", "bazz")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, nil)
	assert.Equal(t, conn2.msgSent, nil)

	// unsubscribe conn1 from "1"
	pubsub.Unsubscribe("1", conn1)

	// publish "qux" to "1"
	pubsub.Publish("1", "qux")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, nil)
	assert.Equal(t, conn2.msgSent, "qux")

	conn1.resetMsgSent()
	conn2.resetMsgSent()

	// unsubscribe conn2 from "1"
	pubsub.Unsubscribe("1", conn2)

	// publish "quux" to "1"
	pubsub.Publish("1", "quux")

	time.Sleep(5 * time.Millisecond)

	assert.Equal(t, conn1.msgSent, nil)
	assert.Equal(t, conn2.msgSent, nil)
}

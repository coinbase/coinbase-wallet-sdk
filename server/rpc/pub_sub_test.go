// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPubSub(t *testing.T) {
	sub1 := make(chan interface{}, 1)
	sub2 := make(chan interface{}, 1)
	defer close(sub1)
	defer close(sub2)

	pubsub := NewPubSub()

	// publishing when nothing is subscribed does nothing
	require.Equal(t, pubsub.Publish("1", "hello"), 0)

	// wait a bit to let async processing finish
	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 0)
	require.Equal(t, len(sub2), 0)

	// subscribe sub1 to "1"
	pubsub.Subscribe("1", sub1)

	// publish "foo" to "1"
	require.Equal(t, pubsub.Publish("1", "foo"), 1)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 1)
	require.Equal(t, len(sub2), 0)
	require.Equal(t, <-sub1, "foo")

	// subscribe sub2 to "1"
	pubsub.Subscribe("1", sub2)

	// publish "bar" to "1"
	require.Equal(t, pubsub.Publish("1", "bar"), 2)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 1)
	require.Equal(t, len(sub2), 1)
	require.Equal(t, <-sub1, "bar")
	require.Equal(t, <-sub2, "bar")

	// subscribe sub1 to "2"
	pubsub.Subscribe("2", sub1)

	// publish "baz" to "2"
	require.Equal(t, pubsub.Publish("2", "baz"), 1)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 1)
	require.Equal(t, len(sub2), 0)
	require.Equal(t, <-sub1, "baz")

	// unsubscribe all subscribers of "2"
	pubsub.UnsubscribeAll("2")

	// publish "bazz" to "2"
	require.Equal(t, pubsub.Publish("2", "bazz"), 0)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 0)
	require.Equal(t, len(sub2), 0)

	// unsubscribe sub1 from "1"
	pubsub.Unsubscribe("1", sub1)

	// publish "qux" to "1"
	require.Equal(t, pubsub.Publish("1", "qux"), 1)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 0)
	require.Equal(t, len(sub2), 1)
	require.Equal(t, <-sub2, "qux")

	// unsubscribe sub2 from "1"
	pubsub.Unsubscribe("1", sub2)

	// publish "quux" to "1"
	require.Equal(t, pubsub.Publish("1", "quux"), 0)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, len(sub1), 0)
	require.Equal(t, len(sub2), 0)
}

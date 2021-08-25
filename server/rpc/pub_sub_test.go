// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package rpc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPubSub(t *testing.T) {
	sub1 := make(chan interface{}, 2)
	sub2 := make(chan interface{}, 2)
	defer close(sub1)
	defer close(sub2)

	pubsub := NewPubSub()

	// publishing when nothing is subscribed does nothing
	require.Equal(t, 0, pubsub.Publish("1", "hello"))

	// wait a bit to let async processing finish
	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 0, len(sub1))
	require.Equal(t, 0, len(sub2))
	require.Equal(t, 0, pubsub.Len("1"))
	require.Equal(t, 0, pubsub.Len("2"))

	// subscribe sub1 to "1"
	pubsub.Subscribe("1", sub1)
	require.Equal(t, 1, pubsub.Len("1"))
	require.Equal(t, 0, pubsub.Len("2"))

	// publish "foo" to "1"
	require.Equal(t, 1, pubsub.Publish("1", "foo"), 1)

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 1, len(sub1))
	require.Equal(t, 0, len(sub2))
	require.Equal(t, "foo", <-sub1)

	// subscribe sub2 to "1"
	pubsub.Subscribe("1", sub2)
	require.Equal(t, 2, pubsub.Len("1"))
	require.Equal(t, 0, pubsub.Len("2"))

	// publish "bar" to "1"
	require.Equal(t, 2, pubsub.Publish("1", "bar"))

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 1, len(sub1))
	require.Equal(t, 1, len(sub2))
	require.Equal(t, "bar", <-sub1)
	require.Equal(t, "bar", <-sub2)

	// subscribe sub1 to "2"
	pubsub.Subscribe("2", sub1)
	require.Equal(t, 2, pubsub.Len("1"))
	require.Equal(t, 1, pubsub.Len("2"))

	// publish "baz" to "2"
	require.Equal(t, 1, pubsub.Publish("2", "baz"))

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 1, len(sub1))
	require.Equal(t, 0, len(sub2))
	require.Equal(t, "baz", <-sub1)

	// unsubscribe sub2 from "1"
	pubsub.Unsubscribe("1", sub2)
	require.Equal(t, 1, pubsub.Len("1"))
	require.Equal(t, 1, pubsub.Len("2"))

	// publish "qux" to "1"
	require.Equal(t, 1, pubsub.Publish("1", "qux"))

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 1, len(sub1))
	require.Equal(t, 0, len(sub2))
	require.Equal(t, "qux", <-sub1)

	// unsubscribe sub1 from all ids
	require.Equal(t, 2, pubsub.UnsubscribeAll(sub1))
	require.Equal(t, 0, pubsub.Len("1"))
	require.Equal(t, 0, pubsub.Len("2"))

	// publish "bazz" to "1" and "2"
	require.Equal(t, 0, pubsub.Publish("1", "bazz"))
	require.Equal(t, 0, pubsub.Publish("2", "bazz"))

	time.Sleep(5 * time.Millisecond)

	require.Equal(t, 0, len(sub1))
	require.Equal(t, 0, len(sub2))
}

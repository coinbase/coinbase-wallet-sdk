// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package store

// Store - store interface
type Store interface {
	Set(key string, value interface{}) error
	Get(key string, value interface{}) (ok bool, err error)
	FindByPrefix(
		prefix string, since int64, unseen bool, values interface{},
	) error
	MarkSeen(key string) (updated bool, err error)
	Remove(key string) error
}

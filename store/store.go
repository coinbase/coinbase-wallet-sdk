// Copyright (c) 2019 Coinbase, Inc. See LICENSE

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

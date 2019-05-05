// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package rpc

import (
	"regexp"
)

var hexStringRegex = regexp.MustCompile("^([a-f0-9]{2})+$")

// Session - rpc session
type Session struct {
	ID  string `json:"id"`
	Key string `json:"key"`
}

// StoreKey - make key for session in the store
func (session *Session) StoreKey() string {
	return "session:" + session.ID
}

func isValidSessionID(id string) bool {
	return len(id) == 32 && hexStringRegex.MatchString(id)
}

func isValidSessionKey(key string) bool {
	return len(key) == 64 && hexStringRegex.MatchString(key)
}

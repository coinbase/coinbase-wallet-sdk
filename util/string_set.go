// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

package util

// StringSet - an unordered collection of unique strings
type StringSet map[string]struct{}

// NewStringSet - initialize a new StringSet
func NewStringSet() StringSet {
	return StringSet{}
}

// StringSetFromStringSlice - make a string set from a slice of strings
func StringSetFromStringSlice(slice []string) StringSet {
	s := NewStringSet()
	for _, str := range slice {
		s.Add(str)
	}
	return s
}

// Add - add value to the set
func (s StringSet) Add(value string) {
	s[value] = struct{}{}
}

// Remove - remove value from the set
func (s StringSet) Remove(value string) {
	delete(s, value)
}

// Contains - checks whether the set contains a given value
func (s StringSet) Contains(value string) bool {
	_, ok := s[value]
	return ok
}

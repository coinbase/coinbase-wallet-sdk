// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package util

import "strings"

// IsBlankString - check whether a given string is blank or has whitespace only
func IsBlankString(str string) bool {
	return len(strings.TrimSpace(str)) == 0
}

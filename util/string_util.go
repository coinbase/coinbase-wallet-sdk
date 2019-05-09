// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package util

import (
	"regexp"
	"strings"
)

var hexStringRegex = regexp.MustCompile("^([a-f0-9])*$")

// IsBlankString - check whether a given string is blank or has whitespace only
func IsBlankString(str string) bool {
	return len(strings.TrimSpace(str)) == 0
}

// IsHexString - check whether a given string is made up of lower-case
// hexadecimal characters
func IsHexString(str string) bool {
	return hexStringRegex.MatchString(str)
}

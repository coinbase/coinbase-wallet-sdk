// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

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

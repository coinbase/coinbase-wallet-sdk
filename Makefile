BUILD_TAGS?='walletlinkd'
APP_PKG="github.com/CoinbaseWallet/walletlinkd/app"
GIT_COMMIT="`git rev-parse --short=8 HEAD`"
VERSION=`cat VERSION`
BUILD_FLAGS=-ldflags "-X $(APP_PKG).GitCommit=$(GIT_COMMIT) -X $(APP_PKG).Version=$(VERSION)"

all: build

build:
	go build $(BUILD_FLAGS) -tags $(BUILD_TAGS) -o build/walletlinkd ./cmd/walletlinkd

test:
	go test -v ./...

run: build
	build/walletlinkd

.PHONY: build test run

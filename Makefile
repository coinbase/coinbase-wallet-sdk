BUILD_TAGS?='walletlinkd'
APP_PKG="github.com/CoinbaseWallet/walletlinkd/app"
GIT_COMMIT="`git rev-parse --short=8 HEAD`"
VERSION=`cat VERSION`
BUILD_FLAGS=-ldflags "-X $(APP_PKG).GitCommit=$(GIT_COMMIT) -X $(APP_PKG).Version=$(VERSION)"
COLORIZE_TEST=sed ''/PASS/s//$$(printf "\033[32mPASS\033[0m")/'' | sed ''/FAIL/s//$$(printf "\033[31mFAIL\033[0m")/''

all: build

build:
	go build $(BUILD_FLAGS) -tags $(BUILD_TAGS) -o build/walletlinkd ./cmd/walletlinkd

test:
	@go test -v ./... -timeout 5s | $(COLORIZE_TEST)

run: build
	build/walletlinkd

.PHONY: build test run

BUILD_TAGS?='walletlinkd'
CONFIG_PKG="github.com/CoinbaseWallet/walletlinkd/config"
GIT_COMMIT="`git rev-parse --short=8 HEAD`"
VERSION=`cat VERSION`
BUILD_FLAGS=-ldflags "-X $(CONFIG_PKG).GitCommit=$(GIT_COMMIT) -X $(CONFIG_PKG).Version=$(VERSION)"
COLORIZE_TEST=sed ''/PASS/s//$$(printf "\033[32mPASS\033[0m")/'' | sed ''/FAIL/s//$$(printf "\033[31mFAIL\033[0m")/''

all: build build-web

build:
	@go build $(BUILD_FLAGS) -tags $(BUILD_TAGS) -o build/walletlinkd ./cmd/walletlinkd

build-web:
	@mkdir -p build
	@cd web && yarn install && yarn build
	@cp -a web/build build/public

init:
	createdb walletlinkd
	createdb walletlinkd_test
	psql walletlinkd -f ./schema.sql
	psql walletlinkd_test -f ./schema.sql

test:
	@APP_ENV="test" POSTGRES_URL="postgres:///walletlinkd_test?sslmode=disable" go test -v ./... -timeout 5s | $(COLORIZE_TEST)

run:
	@POSTGRES_URL="postgres:///walletlinkd?sslmode=disable" build/walletlinkd

.PHONY: build build-web init test run

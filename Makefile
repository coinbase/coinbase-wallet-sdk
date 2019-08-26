BUILD_TAGS?='walletlinkd'
CONFIG_PKG="github.com/walletlink/walletlink/config"
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

db-create:
	createdb walletlinkd
	createdb walletlinkd_test
	psql walletlinkd -f ./schema.sql
	psql walletlinkd_test -f ./schema.sql

db-drop:
	dropdb walletlinkd
	dropdb walletlinkd_test

db-reset: db-drop db-create

test:
	@APP_ENV="test" \
	DATABASE_URL="postgres:///walletlinkd_test?sslmode=disable" \
	go test -v ./... -timeout 5s | $(COLORIZE_TEST)

run:
	@ALLOWED_ORIGINS="http://localhost:3000 http://localhost:3001 http://localhost:8080" \
	DATABASE_URL="postgres:///walletlinkd?sslmode=disable" \
	build/walletlinkd

docker:
	docker build . -t walletlinkd
	docker save -o ./build/walletlinkd.tar walletlinkd

.PHONY: build build-web db-create db-drop db-reset test run docker

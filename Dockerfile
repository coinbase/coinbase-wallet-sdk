################################
# STEP 1 build executable binary
################################

FROM golang:1.13.8-alpine as go-builder

WORKDIR /go/src/github.com/walletlink/walletlink

COPY . ./

RUN apk add --update make
RUN apk add --update git
RUN CGO_ENABLED=0 GOOS=linux make build

#########################
# STEP 2 build web assets
#########################

FROM node:12-alpine as node-builder

WORKDIR /app

COPY ./Makefile ./
COPY ./web ./web

RUN apk add --update make
RUN apk add --update git
RUN npm config set unsafe-perm true
RUN make build-web

############################
# STEP 3 build a small image
############################

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=go-builder /go/src/github.com/walletlink/walletlink/build/walletlinkd ./
COPY --from=node-builder /app/build/public ./public

# distroless lacks a shell
ENTRYPOINT ["/app/walletlinkd"]
# this is needed for heroku
CMD [""]

# walletlinkd

A server + client + web-sdk implementation of the wallet-link protocol.
In a nutshell, the wallet link protocol allows for an external signer to be
interconnected with a dApp via a trustless, encrypted relayer network.

- [walletlinkd](#walletlinkd)
  - [Comparison with other wallet<->dapp protocols](#comparison-with-other-wallet-dapp-protocols)
    - [WalletConnect](#walletconnect)
  - [Terminology](#terminology)
- [walletlinkd server](#walletlinkd-server)
- [walletlink web](#walletlink-web)
- [walletlink js](#walletlink-js)

## Comparison with other wallet<->dapp protocols

### WalletConnect

A distinct difference between both protocols is how they handle sessions.
WalletLink scopes its session at the user level, while WalletConnect scopes its sessions at the
dApp level. <Insert Diagram Here>

The implications of the above design decisions are discussed below:

| Operation               | WalletLink                                                                     | WalletConnect                                                            |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Session Creation        | Created once per user.                                                         | Created every time a user wants to interact with a dApp.                 |
| Session Sharing         | SessionID + SessionKey message via QR Code                                     | [EIP-Based Message](https://eips.ethereum.org/EIPS/eip-1328) via QR Code |
| Session Permissions     | Anyone can join a session given they have the correct sessionID and sessionKey | Users can reject dApp session requests on their signer.                  |
| Transaction Permissions | Signers can reject transaction requests.                                       | Signers can reject transaction requests.                                 |
| Event Types             | Arbitrary data can be encoded into an event at the protocol level.             | Arbitrary data can be encoded into an event at the protocol level.       |
| Real-Time communication | Supported via websockets.                                                      | Supported via websockets.                                                |
| Push notifications      | Supported by a seperate push server.                                           | Supported by a seperate push server.                                     |
| Event propagation       | Encrypted end to end. Bridge only sees encrypted event data.                   | Encrypted end to end. Bridge only sees encrypted event data.             |
| Bridge implementation   | Written in Go.                                                                 | Written in Typescript.                                                   |
| Mobile SDK support      | Kotlin + Swift implementations pending                                         | Kotlin + Swift available                                                 |

## Terminology

- A session is a secure means of sharing communication between multiple participants who
  are all associated with the same identity.
- A session participant is either a host or a guest(s) that is associated with a session.
- A host is a single entity that is the creator of a wallet link session.
  There is a 1 -> N relationship from host -> guests. A host is responsible for communicating with
  its guests. Typically, a host is the the user logged into the wallet link web service.
- A guest is a single entity that is a participant of a wallet link session. A guest is responsible for communicating with its host. Typically, a guest is the user logged into an external signer that supports the wallet link protocol, such as CoinbaseWallet.

# walletlinkd server

The walletlinkd server is an implementation of a wallet link bridge. It basically acts as a fancy message queue between guests and hosts. It is responsible for hosting sessions between hosts and guests and serving encrypted communication events between them via a publish-subscribe pattern. Previously published events are persisted and publicly accessible.

The walletlinkd server consists of the following components:

- RPC over WS
- Event fetching over HTTP

Persistence is either backed by an in-memory store or a postgres database.

The following methods are available for RPC over WS:

- HostSession
- JoinSession
- SetSession
- GetSession
- PublishEvent
- IsLinked
  An up-to date description and explanation of the above methods are available in the [source code](./server/rpc/message_handler.go)

The following methods are available for RPC over HTTP:

- events/{id}
  An up-to date description and explanation of the above methods are available in the [source code](./server/get_event.go)

# walletlink web

The walletlink web application lets users host sessions and acts as a relay between dApp message requests and the walletlink server. It is the component that creates a session, then assigns itself as a host. The session secret and id can then be shared to guests via a displayed QR code. When dApps want to request a signature from a session guest, the message is sent to walletlink web from the walletlink js, then sent to the server which publishes the event to all available guests. When a guest publishes a message to the server, it is then published to the walletlink web application (which is the host), and then is sent to the intended dApp via walletlink js.

# walletlink js

The walletlink js script is a client implementation of the [generic Ethereum JSON-RPC API](https://github.com/ethereum/wiki/wiki/JSON-RPC). It is intended to be a drop-in replacement to the `window.ethereum` and `window.web3` objects typically supplied via metamask or web3.js. Web3 methods that need access to wallet functionality (signing, accounts, ec_recover) are proxied to
external signers registered as session guests via the relay (walletlink web). Web3 methods that do not need access to wallet functionality are send as regular api calls to an Ethereum node.

---

Copyright © 2019 Coinbase, Inc. <https://www.coinbase.com/>

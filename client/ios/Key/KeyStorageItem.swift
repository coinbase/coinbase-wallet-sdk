//
//  KeyStorageItem.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

@available(iOS 13.0, *)
struct KeyStorageItem<K: RawRepresentableKey> {
    let name: String
    
    init(_ name: String) {
        self.name = name
    }

    static var ownPrivateKey: KeyStorageItem<CoinbaseWalletSDK.PrivateKey> {
        return KeyStorageItem<CoinbaseWalletSDK.PrivateKey>("wsegue.ownPrivateKey")
    }
    
    static var peerPublicKey: KeyStorageItem<CoinbaseWalletSDK.PublicKey> {
        return KeyStorageItem<CoinbaseWalletSDK.PublicKey>("wsegue.peerPublicKey")
    }
}

// MARK: -

public protocol RawRepresentableKey {
    init<D>(rawRepresentation data: D) throws where D: ContiguousBytes
    var rawRepresentation: Data { get }
}

@available(iOS 13.0, *)
extension CoinbaseWalletSDK.PrivateKey: RawRepresentableKey {}
@available(iOS 13.0, *)
extension CoinbaseWalletSDK.PublicKey: RawRepresentableKey {}

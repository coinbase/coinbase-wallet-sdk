//
//  KeyStorageItem.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

struct KeyStorageItem<K: RawRepresentableKey> {
    let name: String
    
    init(_ name: String) {
        self.name = name
    }
}

extension KeyStorageItem {
    static var ownPrivateKey: KeyStorageItem<PrivateKey> {
        return KeyStorageItem<PrivateKey>("wsegue.coinbasewallet.ownPrivateKey")
    }
    static var peerPublicKey: KeyStorageItem<PublicKey> {
        return KeyStorageItem<PublicKey>("wsegue.coinbasewallet.peerPublicKey")
    }
}

// MARK: -

protocol RawRepresentableKey {
    init<D>(rawRepresentation data: D) throws where D: ContiguousBytes
    var rawRepresentation: Data { get }
}

extension PrivateKey: RawRepresentableKey {}
extension PublicKey: RawRepresentableKey {}

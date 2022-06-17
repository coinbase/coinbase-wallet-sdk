//
//  KeyStorageItem.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

class KeyStorageItem<K: RawRepresentableKey> {
    let name: String
    
    init(_ name: String) {
        self.name = name
    }
}

// MARK: -

protocol RawRepresentableKey {
    init<D>(rawRepresentation data: D) throws where D: ContiguousBytes
    var rawRepresentation: Data { get }
}

extension PrivateKey: RawRepresentableKey {}
extension PublicKey: RawRepresentableKey {}

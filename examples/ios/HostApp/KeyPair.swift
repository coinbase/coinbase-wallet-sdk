//
//  KeyPair.swift
//  native-sdk-support
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CoinbaseWalletSDK

@available(iOS 13.0, *)
typealias PrivateKey = CoinbaseWalletSDK.PrivateKey

@available(iOS 13.0, *)
typealias PublicKey = CoinbaseWalletSDK.PublicKey

@available(iOS 13.0, *)
struct KeyPair: Encodable {
    let privateKey: PrivateKey
    let publicKey: PublicKey
    
    init() {
        self.privateKey = PrivateKey()
        self.publicKey = privateKey.publicKey
    }
}

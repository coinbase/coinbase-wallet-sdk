//
//  KeyAgreement.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/22/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
extension CoinbaseWalletSDK {
    public typealias PrivateKey = Curve25519.KeyAgreement.PrivateKey
    public typealias PublicKey = Curve25519.KeyAgreement.PublicKey
}

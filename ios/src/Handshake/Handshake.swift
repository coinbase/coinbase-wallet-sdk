//
//  Handshake.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

public enum Handshake {
    public static let salt = "WalletSegue".data(using: .utf8)!

    public struct Request: WalletSegueCodable {
        public let appId: String
        public let callback: URL
        public let publicKey: Curve25519.KeyAgreement.PublicKey
    }
    
    public struct Response: WalletSegueCodable {
        public let hostPublicKey: Curve25519.KeyAgreement.PublicKey
        public let message: Data
//        let accounts: [Account]?
//        struct Account {
//            let chainId: String
//            let address: String
//        }
        
        public init(hostPublicKey: Curve25519.KeyAgreement.PublicKey, message: Data) {
            self.hostPublicKey = hostPublicKey
            self.message = message
        }
    }
}

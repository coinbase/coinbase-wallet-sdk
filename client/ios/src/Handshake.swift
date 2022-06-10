//
//  Handshake.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation

struct HandshakeRequest: Codable {
    let appId: String
    let callback: URL
    let publicKey: WalletSegue.PublicKey
}

public enum Handshake {
    public struct Response: WalletSegueCodable {
        public let hostPublicKey: WalletSegue.PublicKey
        public let message: Data
        
        public init(hostPublicKey: WalletSegue.PublicKey, message: Data) {
            self.hostPublicKey = hostPublicKey
            self.message = message
        }
    }
}

//
//  Handshake.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

public enum Handshake {
    public struct Request: WalletSegueCodable {
        public let appId: String
        public let callback: URL
        public let publicKey: WalletSegue.PublicKey
    }
    
    public struct Response: WalletSegueCodable {
        public let hostPublicKey: WalletSegue.PublicKey
        public let message: Data
        
        public init(hostPublicKey: WalletSegue.PublicKey, message: Data) {
            self.hostPublicKey = hostPublicKey
            self.message = message
        }
    }
}

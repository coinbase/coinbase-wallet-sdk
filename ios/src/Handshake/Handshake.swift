//
//  Handshake.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

enum Handshake {
    
    struct Request: Codable {
        let appId: String
        let callback: URL
        let publicKey: Curve25519.KeyAgreement.PublicKey
    }
    
    struct Response {
        let sharedKey: SymmetricKey
    }
    
}

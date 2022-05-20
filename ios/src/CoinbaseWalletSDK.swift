//
//  CoinbaseWalletSDK.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

class CoinbaseWalletSDK {
    private let bundleId: String
    private let callbackUrl: URL
    private let privateKey: Curve25519.KeyAgreement.PrivateKey
    
    init?(callback: String) {
        guard let bundleId = Bundle.main.bundleIdentifier,
              let callbackUrl = URL(string: callback) else {
            return nil
        }
        self.bundleId = bundleId
        self.callbackUrl = callbackUrl
        
        // TODO: load from storage
        self.privateKey = Curve25519.KeyAgreement.PrivateKey()
    }
    
    func handshakeRequest() {
        let request = Handshake.Request(
            appId: self.bundleId,
            callback: self.callbackUrl,
            publicKey: self.privateKey.publicKey
        )
        
        let encoded = try! request.encode()
        print(encoded)
    }
}

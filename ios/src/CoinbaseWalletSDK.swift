//
//  CoinbaseWalletSDK.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

public class CoinbaseWalletSDK {
    private let appId: String
    private let callback: URL
    
    public init?(
        callback: URL,
        appId: String? = nil
    ) {
        guard let appId = appId ?? Bundle.main.bundleIdentifier else {
            return nil
        }
        self.appId = appId
        self.callback = callback
        
        // TODO: load from storage
        // OR, let SDK consumer inject secure storage?
//        self.privateKey = Curve25519.KeyAgreement.PrivateKey()
    }
    
    public typealias PrivateKey = Curve25519.KeyAgreement.PrivateKey
    
    public func handshakeRequest(privateKey: PrivateKey) {
        let request = Handshake.Request(
            appId: self.appId,
            callback: self.callback,
            publicKey: privateKey.publicKey
        )
        
        let encoded = try! request.encodedString()
        print(encoded)
    }
}

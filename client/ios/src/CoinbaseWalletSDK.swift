//
//  CoinbaseWalletSDK.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

public class CoinbaseWalletSDK {
    public static let salt = "WalletSegue".data(using: .utf8)!
    
    private let appId: String
    private let callback: URL
    
    public init?(
        callback: URL,
        appId: String? = nil
    ) {
        guard let appId = appId ?? Bundle.main.bundleIdentifier else { return nil }
        self.appId = appId
        self.callback = callback
        
        // TODO: load from storage
        // OR, let SDK consumer inject secure storage?
//        self.privateKey = Curve25519.KeyAgreement.PrivateKey()
    }
    
    public func handshakeRequest(privateKey: WalletSegue.PrivateKey) -> String {
        let request = Handshake.Request(
            appId: self.appId,
            callback: self.callback,
            publicKey: privateKey.publicKey
        )
        
        let encoded = try! request.encodedString()
        return encoded
    }
    
    public func deriveSymmetricKey(
        with ownPrivateKey: WalletSegue.PrivateKey,
        _ peerPublicKey: WalletSegue.PublicKey
    ) -> SymmetricKey {
        let sharedSecret = try! ownPrivateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: CoinbaseWalletSDK.salt,
            sharedInfo: Data(),
            outputByteCount: 32
        )
    }
}

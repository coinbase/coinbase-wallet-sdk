//
//  KeyManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation
import CryptoKit

typealias PrivateKey = Curve25519.KeyAgreement.PrivateKey
typealias PublicKey = Curve25519.KeyAgreement.PublicKey

class KeyManager {
    private(set) var ownPrivateKey: PrivateKey {
        didSet {
            try? storage.store(ownPrivateKey, at: .ownPrivateKey)
        }
    }
    private var peerPublicKey: PublicKey? {
        didSet {
            guard let publicKey = self.peerPublicKey else {
                self.symmetricKey = nil
                try? storage.delete(.peerPublicKey)
                return
            }
            
            self.symmetricKey = Self.deriveSymmetricKey(
                with: self.ownPrivateKey,
                publicKey
            )
            try? storage.store(publicKey, at: .peerPublicKey)
        }
    }
    private(set) var symmetricKey: SymmetricKey?
    
    private let storage = KeyStorage()
    
    init() throws {
        guard let storedKey = try storage.read(.ownPrivateKey) else {
            // generate new private key
            self.ownPrivateKey = PrivateKey()
            return
        }
        self.ownPrivateKey = storedKey
        
        self.peerPublicKey = try storage.read(.peerPublicKey)
    }
    
    var ownPublicKey: PublicKey {
        return ownPrivateKey.publicKey
    }
    
    func regenerateOwnPrivateKey() {
        self.ownPrivateKey = PrivateKey()
        self.peerPublicKey = nil
    }
    
    func storePeerPublicKey(_ key: PublicKey) {
        self.peerPublicKey = key
    }
    
    static func deriveSymmetricKey(
        with ownPrivateKey: PrivateKey,
        _ peerPublicKey: PublicKey
    ) -> SymmetricKey {
        let sharedSecret = try! ownPrivateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: Data(),
            outputByteCount: 32
        )
    }
}

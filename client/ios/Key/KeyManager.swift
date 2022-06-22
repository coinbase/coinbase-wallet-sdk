//
//  KeyManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation
import CryptoKit

public typealias PrivateKey = Curve25519.KeyAgreement.PrivateKey
public typealias PublicKey = Curve25519.KeyAgreement.PublicKey

final class KeyManager {
    private(set) var ownPrivateKey: PrivateKey
    var ownPublicKey: PublicKey {
        return ownPrivateKey.publicKey
    }
    
    private(set) var peerPublicKey: PublicKey?
    
    private(set) var symmetricKey: SymmetricKey?
    
    // MARK: - methods
    
    private let storage: KeyStorage
    
    init(host: URL) {
        self.storage = KeyStorage(host: host)
        
        guard let storedKey = try? storage.read(.ownPrivateKey) else {
            // generate new private key
            self.ownPrivateKey = PrivateKey()
            try? self.resetOwnPrivateKey(with: ownPrivateKey)
            return
        }
        self.ownPrivateKey = storedKey
        
        self.peerPublicKey = try? storage.read(.peerPublicKey)
    }
    
    func resetOwnPrivateKey(with key: PrivateKey = PrivateKey()) throws {
        self.symmetricKey = nil
        self.peerPublicKey = nil
        self.ownPrivateKey = key
        try storage.store(key, at: .ownPrivateKey)
        try storage.delete(.peerPublicKey)
    }
    
    func storePeerPublicKey(_ key: PublicKey) throws {
        self.peerPublicKey = key
        self.symmetricKey = try Cipher.deriveSymmetricKey(with: ownPrivateKey, key)
        
        try storage.store(key, at: .peerPublicKey)
    }
}

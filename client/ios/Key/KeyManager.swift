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

let kOwnPrivateKey = KeyStorageItem<PrivateKey>("wsegue.coinbasewallet.ownPrivateKey")
let kPeerPublicKey = KeyStorageItem<PublicKey>("wsegue.coinbasewallet.peerPublicKey")

class KeyManager {
    private(set) var ownPrivateKey: PrivateKey
    private(set) var peerPublicKey: PublicKey? {
        didSet {
            guard let peerPublicKey = self.peerPublicKey else {
                self.symmetricKey = nil
                return
            }
            self.symmetricKey = Self.deriveSymmetricKey(
                with: self.ownPrivateKey,
                peerPublicKey
            )
        }
    }
    private(set) var symmetricKey: SymmetricKey?
    
    private let storage = KeyStorage()
    
    init() throws {
        guard let storedKey = try storage.readKey(from: kOwnPrivateKey) else {
            // generate new private key
            self.ownPrivateKey = PrivateKey()
            try storage.storeKey(ownPrivateKey, to: kOwnPrivateKey)
            try storage.deleteKey(kPeerPublicKey)
            return
        }
        self.ownPrivateKey = storedKey
        
        self.peerPublicKey = try storage.readKey(from: kPeerPublicKey)
    }
    
    var ownPublicKey: PublicKey {
        return ownPrivateKey.publicKey
    }
    
    func regenerateOwnPrivateKey() throws {
        self.ownPrivateKey = PrivateKey()
        try storage.storeKey(ownPrivateKey, to: kOwnPrivateKey)
        
        self.peerPublicKey = nil
        try storage.deleteKey(kPeerPublicKey)
    }
    
    func storePeerPublicKey(_ key: PublicKey) throws {
        self.peerPublicKey = key
        try storage.storeKey(key, to: kPeerPublicKey)
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

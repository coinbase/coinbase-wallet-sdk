//
//  KeyManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation
import CryptoKit

class KeyManager {
    let privateKey = WalletSegue.PrivateKey()
    
    var publicKey: WalletSegue.PublicKey {
        return privateKey.publicKey
    }
    
    func deriveSymmetricKey(
        with ownPrivateKey: WalletSegue.PrivateKey,
        _ peerPublicKey: WalletSegue.PublicKey,
        _ salt: Data
    ) -> SymmetricKey {
        let sharedSecret = try! ownPrivateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: salt,
            sharedInfo: Data(),
            outputByteCount: 32
        )
    }
}

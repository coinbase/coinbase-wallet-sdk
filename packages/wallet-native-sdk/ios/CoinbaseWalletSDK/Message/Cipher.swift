//
//  Cryptography.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public final class Cipher {
    static func encrypt<C: Encodable>(
        _ content: C,
        with symmetricKey: SymmetricKey
    ) throws -> Data {
        let jsonData = try JSONEncoder().encode(content)
        let encrypted = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        
        return encrypted
    }
    
    static func decrypt<C: Decodable>(
        _ data: Data,
        with symmetricKey: SymmetricKey
    ) throws -> C {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
        
        return try JSONDecoder().decode(C.self, from: decrypted)
    }
    
    public static func deriveSymmetricKey(
        with ownPrivateKey: CoinbaseWalletSDK.PrivateKey,
        _ peerPublicKey: CoinbaseWalletSDK.PublicKey
    ) throws -> SymmetricKey {
        let sharedSecret = try ownPrivateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: Data(),
            outputByteCount: 32
        )
    }
}

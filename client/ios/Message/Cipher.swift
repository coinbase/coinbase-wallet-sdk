//
//  Cryptography.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation
import CryptoKit

public class Cipher {
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
        with ownPrivateKey: PrivateKey,
        _ peerPublicKey: PublicKey
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

extension Cipher {
    static func encrypt<C: Encodable>(
        _ content: C,
        encoder: Encoder
    ) throws -> Data {
        let symmetricKey = try self.symmetricKey(from: encoder.userInfo)
        return try encrypt(content, with: symmetricKey)
    }
    
    static func decrypt<C: Decodable>(
        _ data: Data,
        decoder: Decoder
    ) throws -> C {
        let symmetricKey = try self.symmetricKey(from: decoder.userInfo)
        return try decrypt(data, with: symmetricKey)
    }
    
    static var kSymmetricKeyUserInfoKey: CodingUserInfoKey {
        return CodingUserInfoKey(rawValue: "kSymmetricKey")!
    }

    static private func symmetricKey(from userInfo: [CodingUserInfoKey : Any]) throws -> SymmetricKey {
        guard
            let symmetricKey = userInfo[kSymmetricKeyUserInfoKey] as? SymmetricKey
        else {
            throw CoinbaseWalletSDKError.missingSymmetricKey
        }
        return symmetricKey
    }
}

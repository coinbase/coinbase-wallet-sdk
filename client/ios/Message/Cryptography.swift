//
//  Cryptography.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation
import CryptoKit

public final class Cryptography {
    public static func encrypt<C: Encodable>(
        _ content: C,
        to encoder: Encoder
    ) throws -> Data {
        let symmetricKey = try self.symmetricKey(from: encoder.userInfo)
        
        let jsonData = try JSONEncoder().encode(content)
        let encrypted = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        
        return encrypted
    }
    
    public static func decrypt<C: Decodable>(
        _ data: Data,
        from decoder: Decoder
    ) throws -> C {
        let symmetricKey = try self.symmetricKey(from: decoder.userInfo)
        
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
        
        return try JSONDecoder().decode(C.self, from: decrypted)
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

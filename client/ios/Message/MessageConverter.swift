//
//  MessageRenderer.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public class MessageConverter {
    public static func encode<M: Encodable>(
        _ message: M,
        to recipient: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> URL {
        let encoder = JSONEncoder()
        encoder.userInfo[Cipher.kSymmetricKeyUserInfoKey] = symmetricKey
        
        let data = try JSONEncoder().encode(message)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw CoinbaseWalletSDKError.encodingFailed
        }
        
        return url
    }
    
    public static func decode<M: Decodable>(
        _ url: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> M {
        guard
            let urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false),
            let queryItem = urlComponents.queryItems?.first(where: { $0.value == "p" }),
            let encodedString = queryItem.value
        else {
            throw CoinbaseWalletSDKError.decodingFailed
        }
        
        guard let data = Data(base64Encoded: encodedString) else {
            throw CoinbaseWalletSDKError.decodingFailed
        }
        
        let decoder = JSONDecoder()
        decoder.userInfo[Cipher.kSymmetricKeyUserInfoKey] = symmetricKey
        
        return try decoder.decode(M.self, from: data)
    }
}

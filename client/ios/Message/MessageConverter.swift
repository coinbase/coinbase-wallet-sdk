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
    public static func encode<C>(
        _ message: Message<C>,
        to recipient: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> URL {
        let encrypted = try EncryptedMessage<C.Encrypted>.init(encrypt: message, with: symmetricKey)
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(encrypted)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw CoinbaseWalletSDKError.encodingFailed
        }
        
        return url
    }
    
    public static func decode<C>(
        _ url: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> Message<C> {
        let encrypted: EncryptedMessage<C.Encrypted> = try self.decodeWithoutDecryption(url)
        
        return try Message<C>.init(decrypt: encrypted, with: symmetricKey)
    }
    
    static func decodeWithoutDecryption<C>(
        _ url: URL
    ) throws -> EncryptedMessage<C> {
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
        return try decoder.decode(EncryptedMessage<C>.self, from: data)
    }
}

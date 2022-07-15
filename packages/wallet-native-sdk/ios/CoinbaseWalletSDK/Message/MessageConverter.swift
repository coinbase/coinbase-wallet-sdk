//
//  MessageRenderer.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public final class MessageConverter {
    public static func encode<C>(
        _ message: Message<C>,
        to recipient: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> URL {
        let encrypted = try message.encrypt(with: symmetricKey)
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .millisecondsSince1970
        let data = try encoder.encode(encrypted)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw CoinbaseWalletSDK.Error.encodingFailed
        }
        
        return url
    }
    
    public static func decode<C>(
        _ url: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> Message<C> {
        let encrypted: EncryptedMessage<C.Encrypted> = try self.decodeWithoutDecryption(url)
        
        return try encrypted.decrypt(with: symmetricKey)
    }
    
    static func decodeWithoutDecryption<C>(
        _ url: URL
    ) throws -> EncryptedMessage<C> {
        guard
            let urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false),
            let queryItem = urlComponents.queryItems?.first(where: { $0.name == "p" }),
            let encodedString = queryItem.value
        else {
            throw CoinbaseWalletSDK.Error.decodingFailed
        }
        
        guard let data = Data(base64Encoded: encodedString) else {
            throw CoinbaseWalletSDK.Error.decodingFailed
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .millisecondsSince1970
        return try decoder.decode(EncryptedMessage<C>.self, from: data)
    }
}

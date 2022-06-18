//
//  MessageRenderer.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation
import CryptoKit

class MessageConverter {
    let version: String
    
    init() {
        let sdkBundle = Bundle(for: Self.self)
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }
    
    func encode(
        _ message: Message,
        to recipient: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> URL {
        let encoder = JSONEncoder()
        encoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        let data = try JSONEncoder().encode(message)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw CoinbaseWalletSDKError.encodingFailed
        }
        
        return url
    }
    
    func decode(
        _ url: URL,
        with symmetricKey: SymmetricKey?
    ) throws -> Message {
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
        decoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        return try decoder.decode(Message.self, from: data)
    }
}

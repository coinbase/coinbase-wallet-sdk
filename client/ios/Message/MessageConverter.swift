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
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }
    
    func encode(
        _ message: Message,
        to recipient: URL,
        with symmetricKey: SymmetricKey? = nil
    ) throws -> URL {
        let encoder = JSONEncoder()
        encoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        let data = try JSONEncoder().encode(message)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        if recipient.path.isEmpty {
            urlComponents?.path = "wsegue"
        }
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw CoinbaseWalletSDKError.urlEncodingFailed
        }
        
        return url
    }
    
    func decode(
        _ url: URL,
        with symmetricKey: SymmetricKey? = nil
    ) throws -> Message {
        guard
            let urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false),
            urlComponents.path == "wsegue",
            let queryItem = urlComponents.queryItems?.first(where: { $0.value == "p" }),
            let encodedString = queryItem.value
        else {
            throw CoinbaseWalletSDKError.malformedUrl
        }
        
        guard let data = Data(base64Encoded: encodedString) else {
            throw CoinbaseWalletSDKError.notBase64Encoded
        }
        
        let decoder = JSONDecoder()
        decoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        return try decoder.decode(Message.self, from: data)
    }
}

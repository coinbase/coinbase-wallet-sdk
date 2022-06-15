//
//  MessageRenderer.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation
import CryptoKit

enum MessageRenderingError: Error {
    case notBase64Encoded
    case urlEncodingFailed
    case malformedUrl
    case missingSymmetricKey
}

class MessageRenderer {
    let version: String
    
    init() {
        let sdkBundle = Bundle(for: Self.self)
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }
    
    func encode(
        _ message: Message,
        to base: URL,
        with symmetricKey: SymmetricKey? = nil
    ) throws -> URL {
        let encoder = JSONEncoder()
        encoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        let data = try JSONEncoder().encode(message)
        let encodedString = data.base64EncodedString()
        
        var urlComponents = URLComponents(url: base, resolvingAgainstBaseURL: true)
        urlComponents?.path = "wsegue"
        urlComponents?.queryItems = [URLQueryItem(name: "p", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw MessageRenderingError.urlEncodingFailed
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
            throw MessageRenderingError.malformedUrl
        }
        
        guard let data = Data(base64Encoded: encodedString) else {
            throw MessageRenderingError.notBase64Encoded
        }
        
        let decoder = JSONDecoder()
        decoder.userInfo[kSymmetricKeyUserInfoKey] = symmetricKey
        
        return try decoder.decode(Message.self, from: data)
    }
}

private var kSymmetricKeyUserInfoKey: CodingUserInfoKey {
    return CodingUserInfoKey(rawValue: "kSymmetricKey")!
}

extension Message.Content {
    enum CodingKeys: String, CodingKey {
        case handshake, request, response, error
    }
    
    // Encoding
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        if let handshake = try container.decodeIfPresent(Handshake.self, forKey: .handshake) {
            self = .handshake(handshake)
        }
        else if let error = try container.decodeIfPresent(String.self, forKey: .error) {
            self = .error(error)
        }
        else if let encryptedRequest = try container.decodeIfPresent(Data.self, forKey: .request) {
            self = .request(
                try Self.decrypt(encryptedRequest, from: decoder)
            )
        }
        else if let encryptedResponse = try container.decodeIfPresent(Data.self, forKey: .response) {
            self = .response(
                try Self.decrypt(encryptedResponse, from: decoder)
            )
        }
        else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Content decoding error"
                )
            )
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .handshake(handshake):
            try container.encode(handshake, forKey: .handshake)
        case let .error(error):
            try container.encode(error, forKey: .error)
        case let .request(request):
            try container.encode(
                Self.encrypt(request, to: encoder),
                forKey: .request
            )
        case let .response(response):
            try container.encode(
                Self.encrypt(response, to: encoder),
                forKey: .request
            )
        }
    }
    
    // Encryption
    
    static private func symmetricKey(from userInfo: [CodingUserInfoKey : Any]) throws -> SymmetricKey {
        guard
            let symmetricKey = userInfo[kSymmetricKeyUserInfoKey] as? SymmetricKey
        else {
            throw MessageRenderingError.missingSymmetricKey
        }
        return symmetricKey
    }
    
    static private func encrypt<C: Encodable>(
        _ content: C,
        to encoder: Encoder
    ) throws -> Data {
        let symmetricKey = try self.symmetricKey(from: encoder.userInfo)
        
        let jsonData = try JSONEncoder().encode(content)
        let encrypted = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        
        return encrypted
    }
    
    static private func decrypt<C: Decodable>(
        _ data: Data,
        from decoder: Decoder
    ) throws -> C {
        let symmetricKey = try self.symmetricKey(from: decoder.userInfo)
        
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
        
        return try JSONDecoder().decode(C.self, from: decrypted)
    }
    
}

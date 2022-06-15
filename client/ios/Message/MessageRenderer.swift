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
        let content: EncryptedMessage.Content
        switch message.content {
        case .handshake(let appId, let callback):
            content = .handshake(appId: appId, callback: callback)
        case .error(let errorMessage):
            content = .error(errorMessage)
        case .request(let request):
            content = try .request(self.encrypt(request, with: symmetricKey))
        case .response(let response):
            content = try .response(self.encrypt(response, with: symmetricKey))
        }
        
        let encryptedMessage = EncryptedMessage(
            uuid: message.uuid,
            sender: message.sender,
            content: content,
            version: version
        )
        
        let data = try JSONEncoder().encode(encryptedMessage)
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
        
        let encryptedMessage = try JSONDecoder().decode(EncryptedMessage.self, from: data)
        
        let content: Message.Content
        switch encryptedMessage.content {
        case .handshake(let appId, let callback):
            content = .handshake(appId: appId, callback: callback)
        case .error(let errorMessage):
            content = .error(errorMessage)
        case .request(let request):
            content = try .request(self.decrypt(request, with: symmetricKey))
        case .response(let response):
            content = try .response(self.decrypt(response, with: symmetricKey))
        }
        
        return Message(
            uuid: encryptedMessage.uuid,
            sender: encryptedMessage.sender,
            content: content
        )
    }
    
    private func encrypt<C: Encodable>(
        _ content: C,
        with symmetricKey: SymmetricKey?
    ) throws -> Data {
        guard let symmetricKey = symmetricKey else {
            throw MessageRenderingError.missingSymmetricKey
        }
        
        let jsonData = try JSONEncoder().encode(content)
        return try AES.GCM.seal(jsonData, using: symmetricKey).combined!
    }
    
    private func decrypt<C: Decodable>(
        _ data: Data,
        with symmetricKey: SymmetricKey?
    ) throws -> C {
        guard let symmetricKey = symmetricKey else {
            throw MessageRenderingError.missingSymmetricKey
        }
        
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        let decryptedData = try AES.GCM.open(sealedBox, using: symmetricKey)
        return try JSONDecoder().decode(C.self, from: decryptedData)
    }
}

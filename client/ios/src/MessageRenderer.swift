//
//  MessageRenderer.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation
import CryptoKit

struct Message: WalletSegueCodable {
    enum Content: Codable {
        case handshake(HandshakeRequest)
        case encrypted(Data)
    }
    
    let sender: WalletSegue.PublicKey
    let content: Content
    let version: String
    
    func asURL(to recipient: URL) throws -> URL {
        let encodedString = try self.encodedString()
        
        var urlComponents = URLComponents(url: recipient, resolvingAgainstBaseURL: true)
        urlComponents?.path = "wsegue"
        urlComponents?.queryItems = [URLQueryItem(name: "v", value: encodedString)]
        
        guard let url = urlComponents?.url else {
            throw WalletSegueError.urlEncodingFailed
        }
        
        return url
    }
}

class MessageRenderer {
    let version: String
    
    init() {
        let sdkBundle = Bundle(for: Self.self)
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }
    
    func render(
        handshake request: HandshakeRequest,
        sender: WalletSegue.PublicKey,
        recipient: URL
    ) throws -> URL {
        let message = Message(
            sender: sender,
            content: .handshake(request),
            version: version
        )
        return try message.asURL(to: recipient)
    }
    
    func render(
        request: Request,
        sender: WalletSegue.PublicKey,
        recipient: URL,
        symmetricKey: SymmetricKey
    ) throws -> URL {
        let jsonData = try JSONEncoder().encode(request)
        let encryptedData = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        let message = Message(
            sender: sender,
            content: .encrypted(encryptedData),
            version: version
        )
        return try message.asURL(to: recipient)
    }
}

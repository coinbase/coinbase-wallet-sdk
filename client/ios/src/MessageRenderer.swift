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
}

class MessageRenderer {
    let version: String
    
    init() {
        self.version = Bundle(for: Self.self).object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }
    
    func render(
        handshake request: HandshakeRequest,
        sender: WalletSegue.PublicKey
    ) throws -> String {
        let message = Message(
            sender: sender,
            content: .handshake(request),
            version: self.version
        )
        return try message.encodedString()
    }
    
    func render(
        request: Request,
        sender: WalletSegue.PublicKey,
        symmetricKey: SymmetricKey
    ) throws -> String {
        let jsonData = try JSONEncoder().encode(request)
        let encryptedData = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        let message = Message(
            sender: sender,
            content: .encrypted(encryptedData),
            version: self.version
        )
        return try message.encodedString()
    }
}

//
//  EncryptedMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation

struct EncryptedMessage: Codable {
    enum Content: Codable {
        case handshake(appId: String, callback: URL)
        case request(Data) // encrypted
        case response(Data) // encrypted
        case error(String)
    }
    
    let uuid: UUID
    let sender: PublicKey
    let content: Content
    let version: String
}

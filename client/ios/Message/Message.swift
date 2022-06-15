//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation
import CryptoKit

struct Message: Codable {
    enum Content: Codable {
        case handshake(Handshake)
        case request(Request)
        case response(Response)
        case error(String)
    }
    
    let uuid: UUID
    let sender: PublicKey
    let content: Content
    let version: String
}

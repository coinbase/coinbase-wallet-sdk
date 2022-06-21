//
//  RequestMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

public struct RequestMessage: Codable {
    public enum Content {
        case handshake(Handshake)
        case request(Request)
    }
    
    public let uuid: UUID
    public let sender: PublicKey
    public let content: Content
    public let version: String
}

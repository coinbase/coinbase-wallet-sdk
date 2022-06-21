//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public struct ResponseMessage: Codable {
    public enum Content {
        case response(Response)
        case error(ErrorContent)
    }
    
    public let uuid: UUID
    public let sender: PublicKey
    public let content: Content
    public let version: String
    
    public init(
        uuid: UUID,
        sender: PublicKey,
        content: ResponseMessage.Content,
        version: String
    ) {
        self.uuid = uuid
        self.sender = sender
        self.content = content
        self.version = version
    }
}

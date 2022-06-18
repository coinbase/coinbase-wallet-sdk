//
//  Request.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

public struct RequestMessage: EncodableMessage {
    public enum Content: Encodable {
        case handshake(Handshake)
        case request(Request)
    }
    
    public let uuid: UUID
    public let sender: PublicKey
    public let content: Content
    public let version: String
}

extension RequestMessage.Content {
    enum CodingKeys: String, CodingKey {
        case handshake, request
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .handshake(handshake):
            try container.encode(handshake, forKey: .handshake)
        case let .request(request):
            try container.encode(
                Cryptography.encrypt(request, to: encoder),
                forKey: .request
            )
        }
    }
}

public struct Request: Codable {
    struct Action: Codable {
        let method: String
        let params: [String]
    }
    
    let actions: [Action]
    let account: Account?
    
    init(actions: [Action], account: Account? = nil) {
        self.actions = actions
        self.account = account
    }
}

public struct Handshake: Codable {
    let appId: String
    let callback: URL
}

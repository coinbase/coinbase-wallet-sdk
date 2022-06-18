//
//  Request.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

struct RequestMessage: EncodableMessage {
    enum Content: Encodable {
        case handshake(Handshake)
        case request(Request)
    }
    
    let uuid: UUID
    let sender: PublicKey
    let content: Content
    let version: String
}

extension RequestMessage.Content {
    enum CodingKeys: String, CodingKey {
        case handshake, request
    }
    
    func encode(to encoder: Encoder) throws {
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

struct Handshake: Codable {
    let appId: String
    let callback: URL
}

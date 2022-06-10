//
//  Request.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

struct HandshakeRequest: Codable {
    let appId: String
    let callback: URL
    let publicKey: WalletSegue.PublicKey
}

enum Request: Codable {
    struct Action: Codable {
        let method: String
        let params: [String]
    }
    
    case single(uuid: String, request: Action)
    case batch(uuid: String, requests: [Action])
}

//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

struct Message {
    enum Content {
        case handshake(appId: String, callback: URL)
        case request(Request)
        case response(Response)
        case error(String)
    }
    
    let uuid: UUID
    let sender: PublicKey
    let content: Content
}

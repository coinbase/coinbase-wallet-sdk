//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

struct Response: Codable {
    // TODO
    typealias Result = String
    
    let requestId: UUID
    let results: [Result]
}

// TODO, handshake session expiration

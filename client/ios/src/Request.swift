//
//  Request.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

struct Request: Codable {
    struct Action: Codable {
        let method: String
        let params: [String]
    }
    
    struct Account: Codable {
        let chain: String
        let networkId: UInt
        let address: String
    }
    
    let uuid: UUID
    let actions: [Action]
    let account: Account?
}

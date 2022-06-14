//
//  Request.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

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

//
//  Request.swift
//  WalletSegueHost
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct Request: Codable {
    public let actions: [Action]
    public let account: Account?
    
    public init(actions: [Action], account: Account? = nil) {
        self.actions = actions
        self.account = account
    }
    
    public struct Action: Codable {
        let method: String
        let params: [String]
        
        public init(method: String, params: [String]) {
            self.method = method
            self.params = params
        }
    }
}

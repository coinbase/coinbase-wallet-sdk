//
//  Action.swift
//  WalletSegueHost
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct Action: Codable {
    let method: String
    let params: [String]
    
    public init(method: String, params: [String]) {
        self.method = method
        self.params = params
    }
}

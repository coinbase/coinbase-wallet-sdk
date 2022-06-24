//
//  Account.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public struct Account: Codable {
    let chain: String
    let networkId: UInt
    let address: String
    
    public init(chain: String, networkId: UInt, address: String) {
        self.chain = chain
        self.networkId = networkId
        self.address = address
    }
}

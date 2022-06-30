//
//  Account.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public struct Account: Codable {
    public let chain: String
    public let networkId: UInt
    public let address: String
    
    public init(chain: String, networkId: UInt, address: String) {
        self.chain = chain
        self.networkId = networkId
        self.address = address
    }
}

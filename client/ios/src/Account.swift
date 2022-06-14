//
//  Account.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

struct Account: Codable {
    let chain: String
    let networkId: UInt
    let address: String
}

//
//  ErrorContent.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

struct ErrorContent: Codable, Error {
    let requestId: UUID
    let description: String
}

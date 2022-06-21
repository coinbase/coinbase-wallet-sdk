//
//  ErrorContent.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct ErrorContent: Codable, Error {
    public let requestId: UUID
    public let description: String
    
    public init(requestId: UUID, description: String) {
        self.requestId = requestId
        self.description = description
    }
}

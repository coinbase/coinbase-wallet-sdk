//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public struct Message<C: Codable>: Codable {
    public let uuid: UUID
    public let sender: PublicKey
    public let content: C
    public let version: String
}

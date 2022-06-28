//
//  BaseMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public protocol BaseContent: Codable {}
extension Array : BaseContent where Element : BaseContent {}

@available(iOS 13.0, *)
public struct BaseMessage<C: BaseContent>: Codable {
    public let uuid: UUID
    public let sender: CoinbaseWalletSDK.PublicKey
    public let content: C
    public let version: String
}

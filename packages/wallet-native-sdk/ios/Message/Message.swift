//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public typealias Message<C> = BaseMessage<C> where C: UnencryptedContent

@available(iOS 13.0, *)
public protocol UnencryptedContent: BaseContent {
    associatedtype Encrypted: EncryptedContent where Encrypted.Unencrypted == Self
    
    func encrypt(with symmetricKey: SymmetricKey?) throws -> Encrypted
}

// MARK: - base types

public protocol BaseContent: Codable {}
extension Array : BaseContent where Element : BaseContent {}

@available(iOS 13.0, *)
public struct BaseMessage<C: BaseContent>: Codable {
    public let uuid: UUID
    public let sender: CoinbaseWalletSDK.PublicKey
    public let content: C
    public let version: String
    public let timestamp: Date

    static func copy<T>(_ orig: BaseMessage<T>, replaceContentWith content: C) -> BaseMessage<C> {
        return BaseMessage<C>.init(
            uuid: orig.uuid,
            sender: orig.sender,
            content: content,
            version: orig.version,
            timestamp: orig.timestamp
        )
    }
}

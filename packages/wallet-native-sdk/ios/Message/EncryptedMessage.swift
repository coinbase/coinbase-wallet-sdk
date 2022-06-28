//
//  EncryptedMessage.swift
//  CoinbaseWalletSDK
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public protocol EncryptedContent: BaseContent {
    associatedtype Unencrypted: UnencryptedContent where Unencrypted.Encrypted == Self
    
    func decrypt(with symmetricKey: SymmetricKey?) throws -> Unencrypted
}

@available(iOS 13.0, *)
typealias EncryptedMessage<C> = BaseMessage<C> where C: EncryptedContent

// MARK: - helper initializers

@available(iOS 13.0, *)
extension EncryptedMessage {
    func decrypt(with symmetricKey: SymmetricKey?) throws -> Message<C.Unencrypted> {
        return Message<C.Unencrypted>(
            uuid: self.uuid,
            sender: self.sender,
            content: try self.content.decrypt(with: symmetricKey),
            version: self.version
        )
    }
}

@available(iOS 13.0, *)
extension Message {
    func encrypt(with symmetricKey: SymmetricKey?) throws -> EncryptedMessage<C.Encrypted> {
        return EncryptedMessage<C.Encrypted>(
            uuid: self.uuid,
            sender: self.sender,
            content: try self.content.encrypt(with: symmetricKey),
            version: self.version
        )
    }
}

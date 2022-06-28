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
    
    init(encrypt unencrypted: Unencrypted, with symmetricKey: SymmetricKey?) throws
}

@available(iOS 13.0, *)
typealias EncryptedMessage<C> = BaseMessage<C> where C: EncryptedContent

// MARK: - helper initializers

@available(iOS 13.0, *)
extension EncryptedMessage {
    init(encrypt unencrypted: Message<C.Unencrypted>, with symmetricKey: SymmetricKey?) throws {
        self.init(
            uuid: unencrypted.uuid,
            sender: unencrypted.sender,
            content: try C.init(encrypt: unencrypted.content, with: symmetricKey),
            version: unencrypted.version
        )
    }
}

@available(iOS 13.0, *)
extension Message {
    init(decrypt encrypted: EncryptedMessage<C.Encrypted>, with symmetricKey: SymmetricKey?) throws {
        self.init(
            uuid: encrypted.uuid,
            sender: encrypted.sender,
            content: try C.init(decrypt: encrypted.content, with: symmetricKey),
            version: encrypted.version
        )
    }
}

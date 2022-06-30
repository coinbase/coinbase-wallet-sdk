//
//  EncryptedMessage.swift
//  WalletSegue
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

@available(iOS 13.0, *)
extension EncryptedMessage {
    func decrypt(with symmetricKey: SymmetricKey?) throws -> Message<C.Unencrypted> {
        return Message<C.Unencrypted>.copy(
            self,
            replaceContentWith: try self.content.decrypt(with: symmetricKey)
        )
    }
}

@available(iOS 13.0, *)
extension Message {
    func encrypt(with symmetricKey: SymmetricKey?) throws -> EncryptedMessage<C.Encrypted> {
        return EncryptedMessage<C.Encrypted>.copy(
            self,
            replaceContentWith: try self.content.encrypt(with: symmetricKey)
        )
    }
}

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
protocol UnencryptedContent: BaseContent {
    associatedtype Encrypted: EncryptedContent where Encrypted.Unencrypted == Self
    
    init(decrypt encrypted: Encrypted, with symmetricKey: SymmetricKey?) throws
}

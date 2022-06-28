//
//  EncryptedResponseContent.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
enum EncryptedResponseContent: EncryptedContent {
    case response(requestId: UUID, data: Data)
    case failure(requestId: UUID, description: String)
    
    init(encrypt unencrypted: ResponseContent, with symmetricKey: SymmetricKey?) throws {
        switch unencrypted {
        case let .response(requestId, results):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            let encrypted = try Cipher.encrypt(results, with: symmetricKey)
            self = .response(requestId: requestId, data: encrypted)
        case let .failure(requestId, description):
            self = .failure(requestId: requestId, description: description)
        }
    }
}

@available(iOS 13.0, *)
extension ResponseContent {
    init(decrypt encrypted: EncryptedResponseContent, with symmetricKey: SymmetricKey?) throws {
        switch encrypted {
        case let .response(requestId, encryptedResults):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            let values: [ReturnValue] = try Cipher.decrypt(encryptedResults, with: symmetricKey)
            self = .response(requestId: requestId, values: values)
        case let .failure(requestId, description):
            self = .failure(requestId: requestId, description: description)
        }
    }
}

@available(iOS 13.0, *)
typealias EncryptedResponseMessage = EncryptedMessage<EncryptedResponseContent>

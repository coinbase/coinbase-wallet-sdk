//
//  EncryptedResponseContent.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public enum EncryptedResponseContent: EncryptedContent {
    case response(Data)
    case error(ErrorContent)
    
    public init(encrypt unencrypted: ResponseContent, with symmetricKey: SymmetricKey?) throws {
        switch unencrypted {
        case .response(let response):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            self = .response(try Cipher.encrypt(response, with: symmetricKey))
        case .error(let errorContent):
            self = .error(errorContent)
        }
    }
}

@available(iOS 13.0, *)
extension ResponseContent {
    public init(decrypt encrypted: EncryptedResponseContent, with symmetricKey: SymmetricKey?) throws {
        switch encrypted {
        case .response(let data):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            self = .response(try Cipher.decrypt(data, with: symmetricKey))
        case .error(let errorContent):
            self = .error(errorContent)
        }
    }
}

@available(iOS 13.0, *)
typealias EncryptedResponseMessage = EncryptedMessage<EncryptedResponseContent>

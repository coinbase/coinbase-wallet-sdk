//
//  EncryptedRequestContent.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public enum EncryptedRequestContent: EncryptedContent {
    case handshake(Handshake)
    case request(Data)
    
    public init(encrypt unencrypted: RequestContent, with symmetricKey: SymmetricKey?) throws {
        switch unencrypted {
        case .handshake(let handshake):
            self = .handshake(handshake)
        case .request(let request):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            self = .request(try Cipher.encrypt(request, with: symmetricKey))
        }
    }
}

@available(iOS 13.0, *)
extension RequestContent {
    public init(decrypt encrypted: EncryptedRequestContent, with symmetricKey: SymmetricKey?) throws {
        switch encrypted {
        case .handshake(let handshake):
            self = .handshake(handshake)
        case .request(let data):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            self = .request(try Cipher.decrypt(data, with: symmetricKey))
        }
    }
}


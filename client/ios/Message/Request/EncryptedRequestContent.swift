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
    case handshake(appId: String, callback: URL, initialActions: [Action]?)
    case request(Data)
    
    public init(encrypt unencrypted: RequestContent, with symmetricKey: SymmetricKey?) throws {
        switch unencrypted {
        case let .handshake(appId, callback, initialActions):
            self = .handshake(appId: appId, callback: callback, initialActions: initialActions)
        case let .request(actions, account):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            let request = Request(actions: actions, account: account)
            self = .request(try Cipher.encrypt(request, with: symmetricKey))
        }
    }
}

@available(iOS 13.0, *)
extension RequestContent {
    public init(decrypt encrypted: EncryptedRequestContent, with symmetricKey: SymmetricKey?) throws {
        switch encrypted {
        case let .handshake(appId, callback, initialActions):
            self = .handshake(appId: appId, callback: callback, initialActions: initialActions)
        case let .request(data):
            guard let symmetricKey = symmetricKey else {
                throw CoinbaseWalletSDKError.missingSymmetricKey
            }
            let request: Request = try Cipher.decrypt(data, with: symmetricKey)
            self = .request(actions: request.actions, account: request.account)
        }
    }
}


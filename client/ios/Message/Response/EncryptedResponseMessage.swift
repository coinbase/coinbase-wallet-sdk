//
//  EncryptedResponseMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/22/22.
//

import Foundation

@available(iOS 13.0, *)
typealias EncryptedResponseMessage = Message<EncryptedResponseContent>

enum EncryptedResponseContent: Codable {
    case response(Data)
    case error(ErrorContent)
}

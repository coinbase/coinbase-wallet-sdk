//
//  RequestEncoder.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

extension Handshake.Request {
    func encode() throws -> String {
        let encoder = JSONEncoder()
        let data = try encoder.encode(self)
        return data.base64EncodedString()
    }
}

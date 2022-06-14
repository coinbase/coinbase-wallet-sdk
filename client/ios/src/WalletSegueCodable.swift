//
//  WalletSegueCodable.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/2/22.
//

import Foundation
import CryptoKit

public enum WalletSegue {
    public typealias PrivateKey = Curve25519.KeyAgreement.PrivateKey
    public typealias PublicKey = Curve25519.KeyAgreement.PublicKey
}

extension WalletSegue.PublicKey: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let data = try container.decode(Data.self)
        try self.init(rawRepresentation: data)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(self.rawRepresentation)
    }
}

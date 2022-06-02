//
//  WalletSegueCodable.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/2/22.
//

import Foundation

public protocol WalletSegueCodable: Codable {
    func encodedString() throws -> String
    static func decode(_ encodedString: String) throws -> Self
}

enum CodingError: Error {
    case notBase64Encoded
}

public extension WalletSegueCodable {
    func encodedString() throws -> String {
        let data = try JSONEncoder().encode(self)
        return data.base64EncodedString()
    }
    
    static func decode(_ encodedString: String) throws -> Self {
        guard let data = Data(base64Encoded: encodedString) else {
            throw CodingError.notBase64Encoded
        }
        return try JSONDecoder().decode(Self.self, from: data)
    }
}

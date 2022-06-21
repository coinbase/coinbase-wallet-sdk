//
//  ResponseMessage+Decodable.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

extension ResponseMessage: DecodableMessage {}

extension ResponseMessage.Content: Codable {
    enum CodingKeys: String, CodingKey {
        case response, error
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if let error = try container.decodeIfPresent(ErrorContent.self, forKey: .error) {
            self = .error(error)
        }
        else if let encryptedResponse = try container.decodeIfPresent(Data.self, forKey: .response) {
            self = .response(
                try Cryptography.decrypt(encryptedResponse, from: decoder)
            )
        }
        else {
            throw CoinbaseWalletSDKError.decodingFailed
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .error(error):
            try container.encode(error, forKey: .error)
        case let .response(response):
            try container.encode(
                Cryptography.encrypt(response, to: encoder),
                forKey: .response
            )
        }
    }
}

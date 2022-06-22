//
//  RequestMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

public typealias RequestMessage = Message<RequestContent>

public enum RequestContent {
    case handshake(Handshake)
    case request(Request)
}

extension RequestContent: Codable {
    enum CodingKeys: String, CodingKey {
        case handshake, request
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .handshake(handshake):
            try container.encode(handshake, forKey: .handshake)
        case let .request(request):
            try container.encode(
                Cipher.encrypt(request, encoder: encoder),
                forKey: .request
            )
        }
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if let handshake = try container.decodeIfPresent(Handshake.self, forKey: .handshake) {
            self = .handshake(handshake)
        }
        else if let encryptedRequest = try container.decodeIfPresent(Data.self, forKey: .request) {
            self = .request(
                try Cipher.decrypt(encryptedRequest, decoder: decoder)
            )
        }
        else {
            throw CoinbaseWalletSDKError.decodingFailed
        }
    }
}

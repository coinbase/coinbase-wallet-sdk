//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public struct ResponseMessage: DecodableMessage {
    public enum Content: Decodable {
        case response(Response)
        case error(ErrorContent)
    }
    
    public let uuid: UUID
    public let sender: PublicKey
    public let content: Content
    public let version: String
}

extension ResponseMessage.Content {
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
}

public struct Response: Codable {
    // TODO
    typealias Result = String
    
    let requestId: UUID
    let results: [Result]
}

public typealias ResponseResult = Result<Response, Error>
public typealias ResponseHandler = (ResponseResult) -> Void

public struct ErrorContent: Codable, Error {
    let requestId: UUID
    let description: String
}

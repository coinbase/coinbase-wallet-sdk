//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

struct ResponseMessage: DecodableMessage {
    enum Content: Decodable {
        case response(Response)
        case error(ErrorContent)
    }
    
    let uuid: UUID
    let sender: PublicKey
    let content: Content
    let version: String
}

extension ResponseMessage.Content {
    enum CodingKeys: String, CodingKey {
        case response, error
    }
    
    init(from decoder: Decoder) throws {
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
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: [],
                    debugDescription: "Content decoding error"
                )
            )
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

struct ErrorContent: Codable, Error {
    let requestId: UUID
    let description: String
}

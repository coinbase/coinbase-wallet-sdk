//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public typealias ResponseMessage = Message<ResponseContent>

public enum ResponseContent {
    case response(Response)
    case error(ErrorContent)
}

@available(iOS 13.0, *)
extension ResponseContent: Codable {
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
                try Cipher.decrypt(encryptedResponse, decoder: decoder)
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
                Cipher.encrypt(response, encoder: encoder),
                forKey: .response
            )
        }
    }
}

@available(iOS 13.0, *)
extension ResponseMessage {
    public init(
        uuid: UUID,
        sender: CoinbaseWalletSDK.PublicKey,
        content: ResponseContent,
        version: String
    ) {
        self.uuid = uuid
        self.sender = sender
        self.content = content
        self.version = version
    }
    
    init(decrypt encrypted: EncryptedResponseMessage, with symmetricKey: SymmetricKey) throws {
        let content: ResponseContent
        switch encrypted.content {
        case .response(let response):
            content = try Cipher.decrypt(response, with: symmetricKey)
        case .error(let error):
            content = .error(error)
        }
        
        self.init(
            uuid: encrypted.uuid,
            sender: encrypted.sender,
            content: content,
            version: encrypted.version
        )
    }
}

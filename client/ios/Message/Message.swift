//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

public protocol Message {
    associatedtype Content
    
    var uuid: UUID { get }
    var sender: PublicKey { get }
    var content: Content { get }
    var version: String { get }
}

public protocol EncodableMessage: Message, Encodable where Content: Encodable {}

public protocol DecodableMessage: Message, Decodable where Content: Decodable {}

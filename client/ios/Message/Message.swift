//
//  Message.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

protocol Message {
    associatedtype Content
    
    var uuid: UUID { get }
    var sender: PublicKey { get }
    var content: Content { get }
    var version: String { get }
    
    init(uuid: UUID, sender: PublicKey, content: Content, version: String)
}

protocol EncodableMessage: Message, Encodable where Content: Encodable {}

protocol DecodableMessage: Message, Decodable where Content: Decodable {}

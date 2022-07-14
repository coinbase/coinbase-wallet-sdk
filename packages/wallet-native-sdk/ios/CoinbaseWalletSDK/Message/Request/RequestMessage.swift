//
//  RequestMessage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

@available(iOS 13.0, *)
public enum RequestContent: UnencryptedContent {
    case handshake(appId: String, callback: URL, initialActions: [Action]?)
    case request(actions: [Action], account: Account? = nil)
}

@available(iOS 13.0, *)
public typealias RequestMessage = Message<RequestContent>

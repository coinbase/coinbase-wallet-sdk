//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/13/22.
//

import Foundation

@available(iOS 13.0, *)
public enum ResponseContent: UnencryptedContent {
    case response(Response)
    case error(ErrorContent)
}

@available(iOS 13.0, *)
public typealias ResponseMessage = Message<ResponseContent>

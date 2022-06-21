//
//  Handshake.swift
//  WalletSegueHost
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct Handshake: Codable {
    public let appId: String
    public let callback: URL
    
    public let initialRequest: Request?
    
    public init(appId: String, callback: URL, initialRequest: Request? = nil) {
        self.appId = appId
        self.callback = callback
        self.initialRequest = initialRequest
    }
}

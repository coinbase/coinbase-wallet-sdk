//
//  CoinbaseWalletSDK.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

public class CoinbaseWalletSDK {
    let appId: String
    let host: URL
    let callback: URL
    
    /// Instantiate Coinbase Wallet SDK
    /// - Parameters:
    ///   - host: universal link url of the host wallet to interact with
    ///   - callback: own url to get responses back
    public init(
        host: URL = URL(string: "https://go.cb-w.com/")!,
        callback: URL
    ) {
        self.appId = Bundle.main.bundleIdentifier!
        self.host = host
        self.callback = callback
    }
    
//    public private(set) static var shared: CoinbaseWalletSDK?
//
//    public static func setup(
//        host: URL = URL(string: "https://go.cb-w.com/")!,
//        callback: URL
//    ) {
//        CoinbaseWalletSDK.shared = CoinbaseWalletSDK(host: host, callback: callback)
//    }
    
    static func isCoinbaseWalletInstalled() -> Bool {
        return UIApplication.shared.canOpenURL(URL(string: "cbwallet://")!)
    }
    
    private let keyManager = KeyManager()
    private let messageRenderer = MessageRenderer()
    private let executionManager = TaskManager()
    
    public func initiateHandshake() throws {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.publicKey,
            content: .handshake(Handshake(appId: appId, callback: callback)),
            version: ""
        )
        try self.send(message)
    }
    
    public func makeRequest(_ request: Request) throws {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.publicKey,
            content: .request(request),
            version: ""
        )
        try self.send(message)
    }
    
    private func send(_ message: Message) throws {
        let url = try messageRenderer.encode(message, to: host, with: keyManager.symmetricKey)
        UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { result in
            print(result)
        }
    }
}

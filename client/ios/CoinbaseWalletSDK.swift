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
    
    let keyManager: KeyManager
    let messageConverter: MessageConverter
    let taskManager: TaskManager
    
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
        
        self.keyManager = KeyManager(host: host)
        self.messageConverter = MessageConverter()
        self.taskManager = TaskManager()
    }
    
//    public private(set) static var shared: CoinbaseWalletSDK?
//
//    public static func setup(
//        host: URL = URL(string: "https://go.cb-w.com/")!,
//        callback: URL
//    ) {
//        CoinbaseWalletSDK.shared = CoinbaseWalletSDK(host: host, callback: callback)
//    }
    
    // MARK: - Send message
    
    public func initiateHandshake(onResponse: @escaping ResponseHandler) {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.ownPublicKey,
            content: .handshake(Handshake(appId: appId, callback: callback)),
            version: ""
        )
        self.send(message, onResponse)
    }
    
    public func makeRequest(_ request: Request, onResponse: @escaping ResponseHandler) {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.ownPublicKey,
            content: .request(request),
            version: ""
        )
        self.send(message, onResponse)
    }
    
    private func send(_ message: Message, _ onResponse: @escaping ResponseHandler) {
        let url: URL
        do {
            url = try self.messageConverter.encode(message, to: host, with: keyManager.symmetricKey)
        } catch {
            onResponse(.failure(error))
            return
        }
        
        UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { result in
            guard result == true else {
                onResponse(.failure(CoinbaseWalletSDKError.openUrlFailed))
                return
            }
            
            self.taskManager.registerResponseHandler(for: message, onResponse)
        }
    }
    
    // MARK: - Session
    
    public func isConnected() -> Bool {
        return keyManager.symmetricKey != nil
    }
    
    public func resetConnection() -> Result<Void, Error> {
        do {
            try keyManager.resetOwnPrivateKey()
            return .success(())
        } catch {
            return .failure(error)
        }
    }
    
    // MARK: - static methods
    
    public static func isCoinbaseWalletInstalled() -> Bool {
        return UIApplication.shared.canOpenURL(URL(string: "cbwallet://")!)
    }
}

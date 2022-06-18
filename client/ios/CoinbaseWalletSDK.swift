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
    
    lazy var keyManager: KeyManager = {
        KeyManager(host: self.host)
    }()
    lazy var messageConverter: MessageConverter = {
        MessageConverter()
    }()
    lazy var taskManager: TaskManager = {
        TaskManager()
    }()
    
    /// Instantiate Coinbase Wallet SDK
    /// - Parameters:
    ///   - host: universal link url of the host wallet to interact with
    ///   - callback: own url to get responses back
    public init(
        host: URL = URL(string: "https://go.cb-w.com/wsegue")!,
        callback: URL
    ) {
        self.appId = Bundle.main.bundleIdentifier!
        self.host = host
        if callback.pathComponents.count < 2 { // [] or ["/"]
            self.callback = callback.appendingPathComponent("wsegue")
        } else {
            self.callback = callback
        }
    }
    
    // MARK: - Send message
    
    public func initiateHandshake(completion: @escaping (Error?) -> Void) {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.ownPublicKey,
            content: .handshake(Handshake(appId: appId, callback: callback)),
            version: ""
        )
        self.send(message) { result in
            switch result {
            case .success(let response):
                guard
                    let encodedPeerPublicKey = response.results.first,
                    let data = Data(base64Encoded: encodedPeerPublicKey),
                    let peerPublicKey = try? PublicKey(rawRepresentation: data)
                else {
                    completion(CoinbaseWalletSDKError.decodingFailed)
                    return
                }
                try! self.keyManager.storePeerPublicKey(peerPublicKey)
                
            case .failure(let error):
                completion(error)
            }
        }
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
            url = try messageConverter.encode(message, to: host, with: keyManager.symmetricKey)
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
    
    // MARK: - Receive message
    
    private func isWalletSegueMessage(_ url: URL) -> Bool {
        return url.host == callback.host && url.path == callback.path
    }
    
    public func handleResponse(_ url: URL) -> Result<Bool, Error> {
        guard isWalletSegueMessage(url) else {
            return .success(false)
        }
        
        let message: Message
        do {
            message = try messageConverter.decode(url, with: keyManager.symmetricKey)
        } catch {
            return .failure(error)
        }
        
        taskManager.handleMessage(message)
        
        return .success(true)
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

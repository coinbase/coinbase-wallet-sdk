//
//  CoinbaseWalletSDK.swift
//  WalletSegue
//
//  Created by Jungho Bang on 5/20/22.
//

import Foundation
import CryptoKit

@available(iOS 13.0, *)
public class CoinbaseWalletSDK {
    
    // MARK: - Constructor
    
    static private var host: URL?
    static private var callback: URL?
    
    static public func configure(
        host: URL = URL(string: "https://go.cb-w.com/wsegue")!,
        callback: URL
    ) {
        guard self.host == nil && self.callback == nil else {
            assertionFailure("`CoinbaseWalletSDK.configure` should be called only once.")
            return
        }
        
        self.host = host
        if callback.pathComponents.count < 2 { // [] or ["/"]
            self.callback = callback.appendingPathComponent("wsegue")
        } else {
            self.callback = callback
        }
    }
    
    static public var shared: CoinbaseWalletSDK = {
        guard let host = CoinbaseWalletSDK.host,
              let callback = CoinbaseWalletSDK.callback else {
            preconditionFailure("Missing configuration: call `CoinbaseWalletSDK.configure` before accessing the `shared` instance.")
        }
        
        return CoinbaseWalletSDK(host: host, callback: callback)
    }()
    
    // MARK: - Properties
    
    private let appId: String
    private let host: URL
    private let callback: URL
    private let version: String
    
    private lazy var keyManager: KeyManager = {
        KeyManager(host: self.host)
    }()
    private lazy var taskManager: TaskManager = {
        TaskManager()
    }()
    
    private init(
        host: URL,
        callback: URL
    ) {
        self.host = host
        self.callback = callback
        
        self.appId = Bundle.main.bundleIdentifier!
        
        let sdkBundle = Bundle(for: Self.self)
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }
    
    // MARK: - Send message
    
    @discardableResult
    public func initiateHandshake(initialActions: [Action]? = nil, onResponse: @escaping ResponseHandler) -> URL? {
        let message = RequestMessage(
            uuid: UUID(),
            sender: keyManager.ownPublicKey,
            content: .handshake(
                appId: appId,
                callback: callback,
                initialActions: initialActions
            ),
            version: version,
            timestamp: Date()
        )
        return self.send(message, onResponse)
    }
    
    @discardableResult
    public func makeRequest(_ request: Request, onResponse: @escaping ResponseHandler) -> URL? {
        let message = RequestMessage(
            uuid: UUID(),
            sender: keyManager.ownPublicKey,
            content: .request(actions: request.actions, account: request.account),
            version: version,
            timestamp: Date()
        )
        return self.send(message, onResponse)
    }
    
    private func send(_ message: RequestMessage, _ onResponse: @escaping ResponseHandler) -> URL? {
        let url: URL
        do {
            url = try MessageConverter.encode(message, to: host, with: keyManager.symmetricKey)
        } catch {
            onResponse(.failure(error))
            return nil
        }
        
        UIApplication.shared.open(
            url,
            options: [.universalLinksOnly: url.isHttp]
        ) { result in
            guard result == true else {
                onResponse(.failure(Error.openUrlFailed))
                return
            }
            
            self.taskManager.registerResponseHandler(for: message, onResponse)
        }
        
        return url
    }
    
    // MARK: - Receive message
    
    private func isWalletSegueMessage(_ url: URL) -> Bool {
        return url.host == callback.host && url.path == callback.path
    }
    
    public func handleResponse(_ url: URL) throws -> Bool {
        guard isWalletSegueMessage(url) else {
            return false
        }
        
        let response = try decodeResponse(url)
        taskManager.handleResponseMessage(response)
        return true
    }
    
    private func decodeResponse(_ url: URL) throws -> ResponseMessage {
        let response: ResponseMessage
        if let symmetricKey = keyManager.symmetricKey {
            response = try MessageConverter.decode(url, with: symmetricKey)
        } else {
            let encrypted: EncryptedResponseMessage = try MessageConverter.decodeWithoutDecryption(url)
            try keyManager.storePeerPublicKey(encrypted.sender)
            
            guard let symmetricKey = keyManager.symmetricKey else {
                throw Error.missingSymmetricKey
            }
            
            response = try encrypted.decrypt(with: symmetricKey)
        }
        return response
    }
    
    // MARK: - Session
    
    public func isConnected() -> Bool {
        return keyManager.symmetricKey != nil
    }
    
    public var sessionPublicKey: PublicKey {
        return keyManager.ownPublicKey
    }
    
    @discardableResult
    public func resetSession() -> Result<Void, Swift.Error> {
        do {
            taskManager.reset()
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

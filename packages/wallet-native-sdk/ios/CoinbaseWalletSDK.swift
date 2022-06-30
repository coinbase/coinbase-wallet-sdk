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
            try openURLSynchronously(url)
        } catch {
            onResponse(.failure(error))
            return nil
        }
        
        taskManager.registerResponseHandler(for: message, onResponse)
        return url
    }
    
    private func openURLSynchronously(_ url: URL) throws {
        var openURLResult: Bool?
        
        let dispatchGroup = DispatchGroup()
        dispatchGroup.enter()
        UIApplication.shared.open(
            url,
            options: [.universalLinksOnly: url.isHttp]
        ) { result in
            openURLResult = result
            dispatchGroup.leave()
        }
        dispatchGroup.wait()
        
        guard openURLResult == true else {
            throw Error.openUrlFailed
        }
    }
    
    // MARK: - Receive message
    
    private func isWalletSegueMessage(_ url: URL) -> Bool {
        return url.host == callback.host && url.path == callback.path
    }
    
    @discardableResult
    public func handleResponse(_ url: URL) throws -> Bool {
        guard isWalletSegueMessage(url) else {
            return false
        }
        
        let response = try decodeResponse(url)
        taskManager.runResponseHandler(with: response)
        return true
    }
    
    private func decodeResponse(_ url: URL) throws -> ResponseMessage {
        if let symmetricKey = keyManager.symmetricKey {
            return try MessageConverter.decode(url, with: symmetricKey)
        }
        
        // no symmetric key yet
        let encryptedResponse: EncryptedResponseMessage = try MessageConverter.decodeWithoutDecryption(url)
        let request = taskManager.findRequest(for: encryptedResponse)
        guard case .handshake = request?.content else {
            throw Error.missingSymmetricKey
        }
        
        handleNewSession(encryptedResponse)
        
        guard let symmetricKey = keyManager.symmetricKey else {
            throw Error.missingSymmetricKey
        }
        
        return try encryptedResponse.decrypt(with: symmetricKey)
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
    
    private func handleNewSession(_ response: EncryptedResponseMessage) {
        
    }
    
    // MARK: - static methods
    
    public static func isCoinbaseWalletInstalled() -> Bool {
        return UIApplication.shared.canOpenURL(URL(string: "cbwallet://")!)
    }
}

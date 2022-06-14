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
    let version: String
    
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
        
        let sdkBundle = Bundle(for: Self.self)
        self.version = sdkBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
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
    private let executionManager = TaskManager()
    
    public func initiateHandshake() throws {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.publicKey,
            content: .handshake(appId: appId, callback: callback),
            version: version
        )
        try self.send(message)
    }
    
    public func makeRequest(_ request: Request) throws {
        let jsonData = try JSONEncoder().encode(request)
        let encryptedData = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
        let message = Message(
            uuid: UUID(),
            sender: keyManager.publicKey,
            content: .request(encryptedData),
            version: version
        )
        try self.send(message)
    }
    
    private func send(_ message: Message) throws {
        let url = try message.asURL(to: callback)
        UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { result in
            print(result)
        }
    }
}

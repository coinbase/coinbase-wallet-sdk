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
    
    static func isCoinbaseWalletInstalled() -> Bool {
        return UIApplication.shared.canOpenURL(URL(string: "cbwallet://")!)
    }
    
    private let keyManager = KeyManager()
    // private let requestManager
    // private let messageParser
    
    public func initiateHandshake() throws {
        let message = Message(
            uuid: UUID(),
            sender: keyManager.publicKey,
            content: .handshake(appId: appId, callback: callback),
            version: version
        )
        try self.send(message)
    }
    
//    func render(
//        request: Request,
//        sender: WalletSegue.PublicKey,
//        recipient: URL,
//        symmetricKey: SymmetricKey
//    ) throws -> URL {
//        let jsonData = try JSONEncoder().encode(request)
//        let encryptedData = try AES.GCM.seal(jsonData, using: symmetricKey).combined!
//        let message = Message(
//            sender: sender,
//            content: .encrypted(encryptedData),
//            version: version
//        )
//        return try message.asURL(to: recipient)
//    }
    
    private func send(_ message: Message) throws {
        let url = try message.asURL(to: callback)
        UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { result in
            print(result)
        }
    }
    
    public func deriveSymmetricKey(
        with ownPrivateKey: WalletSegue.PrivateKey,
        _ peerPublicKey: WalletSegue.PublicKey
    ) -> SymmetricKey {
        return keyManager.deriveSymmetricKey(with: ownPrivateKey, peerPublicKey, self.callback.dataRepresentation)
    }
}

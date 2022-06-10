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
    
    private let keyManager = KeyManager()
    private let messageRenderer = MessageRenderer()
    
    public func initiateHandshake() throws {
        let publicKey = keyManager.publicKey
        let request = HandshakeRequest(
            appId: self.appId,
            callback: self.callback,
            publicKey: publicKey
        )
        let message = try messageRenderer.render(
            handshake: request,
            sender: publicKey,
            recipient: self.host
        )
        UIApplication.shared.open(message, options: [.universalLinksOnly: true]) { result in
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

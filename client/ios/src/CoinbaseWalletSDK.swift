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
    
    let keyManager = KeyManager()
    let messageRenderer = MessageRenderer()
    
    public init(
        host: URL = URL(string: "https://go.cb-w.com/")!,
        callback: URL
    ) {
        self.appId = Bundle.main.bundleIdentifier!
        self.host = host
        self.callback = callback
    }
    
    public func handshakeRequest() throws -> String {
        let publicKey = keyManager.publicKey
        let request = HandshakeRequest(
            appId: self.appId,
            callback: self.callback,
            publicKey: publicKey
        )
        return try messageRenderer.render(
            handshake: request,
            sender: publicKey
        )
    }
    
    public func deriveSymmetricKey(
        with ownPrivateKey: WalletSegue.PrivateKey,
        _ peerPublicKey: WalletSegue.PublicKey
    ) -> SymmetricKey {
        return keyManager.deriveSymmetricKey(with: ownPrivateKey, peerPublicKey, self.callback.dataRepresentation)
    }
}

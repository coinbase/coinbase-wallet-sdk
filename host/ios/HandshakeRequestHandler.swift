//
//  HandshakeRequestHandler.swift
//  WalletSegueHost
//
//  Created by Jungho Bang on 6/2/22.
//

import Foundation
import CoinbaseWalletSDK
import CryptoKit

@available(iOS 13.0, *)
public class HandshakeRequestHandler {
    public init() {}

    public func handle(request encodedURL: URL) -> URL? {
        let request: RequestMessage = try! MessageConverter.decode(encodedURL, with: nil)
        
        guard case .handshake(let handshake) = request.content else {
            return nil
        }

        let hostKey = Curve25519.KeyAgreement.PrivateKey()
        
        let symmetricKey = try! Cipher.deriveSymmetricKey(
            with: hostKey, request.sender
        )

        let message = ResponseMessage(
            uuid: UUID(),
            sender: hostKey.publicKey,
            content: .response(
                requestId: request.uuid,
                values: []
            ),
            version: "0.0"
        )

        return try! MessageConverter.encode(message, to: handshake.callback, with: symmetricKey)
    }
}

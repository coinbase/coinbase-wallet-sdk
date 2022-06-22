//
//  HandshakeRequestHandler.swift
//  WalletSegueHost
//
//  Created by Jungho Bang on 6/2/22.
//

import Foundation
import WalletSegue
import CryptoKit

public class HandshakeRequestHandler {
    public init() {}

    public func handle(request encodedURL: URL) -> URL? {
        let request: RequestMessage = try! MessageConverter.decode(encodedURL, with: nil)
        
        guard case .handshake(let handshake) = request.content else {
            return nil
        }

        let hostKey = Curve25519.KeyAgreement.PrivateKey()
        
        let symmetricKey = Cipher.deriveSymmetricKey(
            with: hostKey, request.sender
        )

        let message = ResponseMessage(
            uuid: UUID(),
            sender: hostKey.publicKey,
            content: .response(Response(
                requestId: request.uuid,
                results: [])
            ),
            version: "0.0"
        )

        return try! MessageConverter.encode(message, to: handshake.callback, with: symmetricKey)
    }
}

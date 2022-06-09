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
    
    public func handle(request encodedString: String) -> Handshake.Response {
        let request = try! Handshake.Request.decode(encodedString)
        
        let hostKey = Curve25519.KeyAgreement.PrivateKey()
        
        // Host derives symmetric key
        let sharedSecret = try! hostKey.sharedSecretFromKeyAgreement(
            with: request.publicKey)
        let symmetricKey = sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Handshake.salt,
            sharedInfo: Data(),
            outputByteCount: 32
        )
        
        let message = "This is encrypted message using shared key derived from public keys of client and host".data(using: .utf8)!
        
        // sender encrypts data
        let encryptedData = try! AES.GCM.seal(message, using: symmetricKey).combined
        
        let response = Handshake.Response(
            hostPublicKey: hostKey.publicKey,
            message: encryptedData!
        )
        
        return response
    }
}

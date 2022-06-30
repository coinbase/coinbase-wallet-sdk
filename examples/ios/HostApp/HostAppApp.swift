//
//  HostAppApp.swift
//  HostApp
//
//  Created by Jungho Bang on 6/8/22.
//

import SwiftUI
import CoinbaseWalletSDK

@main
struct HostAppApp: App {
    func onAppear() {
//        let callbackURL = URL(string: "https://myapp.xyz/native-sdk")!
//        //      let nativeSDK = CoinbaseWalletSDK(callback: callbackURL)
//
//        let sPrivateKey = CoinbaseWalletSDK.PrivateKey()
//        let rPrivateKey = CoinbaseWalletSDK.PrivateKey()
//
//        let sPublicKey = sPrivateKey.publicKey
//        let rPublicKey = rPrivateKey.publicKey
//
//        let initialRequest = [Action(method: "eth_someMethod", params: ["param1", "param2"]), Action(method: "eth_someMethod2", params: ["param1", "param2"])]

//        let requestMessage = RequestMessage(
//            uuid: UUID(),
//            sender: sPublicKey,
//            content: .request(actions: initialRequest, account: Account(
//                chain: "eth",
//                networkId: 17,
//                address: "0x12345678ABCD")),
//            version: "1.2.3"
//        )
//        let responseMessage = ResponseMessage(
//            uuid: UUID(),
//            sender: rPublicKey,
//            content: .error(
//                requestId: UUID(),
//                description: "error message from host"
//            ),
//            version: "7.13.1"
//        )
//
//        let symmetricKey = try! Cipher.deriveSymmetricKey(with: sPrivateKey, rPublicKey)
//
//        let encodedRequest = try! MessageConverter.encode(responseMessage, to: URL(string: "https://myapp.xyz/native-sdk")!, with: symmetricKey)
//
//        print(encodedRequest)

//        let hostSDK = NativeSDKSupport()
//        hostSDK.decodeRequest(
//            encodedRequest.absoluteString,
//            ownPrivateKeyStr: rPrivateKey.base64EncodedString(),
//            peerPublicKeyStr: sPublicKey.base64EncodedString(),
//            resolve: { result in
//                print(result)
//            }, reject: { _,err,e in
//                print(err)
//                print(e)
//            }
//        )

    }
    var body: some Scene {
        WindowGroup {
            ContentView().onAppear {
                self.onAppear()
            }
        }
    }
}

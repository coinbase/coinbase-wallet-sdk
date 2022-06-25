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
        let callbackURL = URL(string: "https://myapp.xyz/native-sdk")!
        //      let nativeSDK = CoinbaseWalletSDK(callback: callbackURL)

        let sPrivateKey = CoinbaseWalletSDK.PrivateKey()
        let rPrivateKey = CoinbaseWalletSDK.PrivateKey()

        let sPublicKey = sPrivateKey.publicKey
        let rPublicKey = rPrivateKey.publicKey

        let initialRequest = Request(actions: [Request.Action(method: "eth_someMethod", params: ["param1", "param2"])], account: Account(chain: "eth", networkId: 3, address: "0x1234ABCD"))

        let requestMessage = RequestMessage(
            uuid: UUID(),
            sender: sPublicKey,
            content: .handshake(
              Handshake(
                appId: "com.myapp.package.id",
                callback: callbackURL,
                initialRequest: initialRequest
              )
            ),
            version: "1.2.3"
        )

        let encodedRequest = try! MessageConverter.encode(requestMessage, to: URL(string: "https://go.cb-w.com/wsegue")!, with: nil)


        let hostSDK = NativeSDKSupport()
        hostSDK.decodeRequest(
            encodedRequest.absoluteString,
            ownPrivateKeyStr: rPrivateKey.base64EncodedString(),
            peerPublicKeyStr: sPublicKey.base64EncodedString(),
            resolve: { result in
                print(result)
            }, reject: { _,err,e in
                print(err)
                print(e)
            }
        )

    }
    var body: some Scene {
        WindowGroup {
            ContentView().onAppear {
                self.onAppear()
            }
        }
    }
}

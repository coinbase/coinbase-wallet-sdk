//
//  ContentView.swift
//  ClientApp
//
//  Created by Jungho Bang on 5/19/22.
//

import SwiftUI
import WalletSegue

import CryptoKit

struct ContentView: View {
    let sdk = CoinbaseWalletSDK(callback: URL(string: "https://go.cb-w.com/")!)
    
    let clientPrivateKey = Curve25519.KeyAgreement.PrivateKey()
//    @State var request: String?
    
    @State var response: String?
    
    @State var parsedResponse: Handshake.Response?
    @State var decryptedMessage: String?
    
    var body: some View {
        VStack {
            VStack {
                Text("Generated Private Key: ")
                Text(String(data: self.clientPrivateKey.rawRepresentation, encoding: .ascii) ?? "(none)")
                
                Button("Initiate handshake request") {
                    try! sdk.initiateHandshake()
                }
//                HStack {
//                    Text("Request: ")
//                    Text(self.request ?? "(none)")
//                }
            }
            
            Spacer()
            
            VStack {
                Button("(Host) Handle handshake request") {
//                    let handler = HandshakeRequestHandler()
//                    let response = handler.handle(request: self.request!)
//                    self.response = try! response.encodedString()
                }
                HStack {
                    Text("Response: ")
                    Text(self.response ?? "(none)")
                }
            }
            
            Spacer()
            
            VStack(alignment: .leading) {
                Button("Parse handshake response from Host") {
                    self.parsedResponse = try! Handshake.Response.decode(self.response!)
                }
                HStack {
                    Text("Message: ")
                    Text(String(data: self.parsedResponse?.message ?? Data(), encoding: .ascii) ?? "(none)")
                }
                HStack {
                    Text("Host Pub Key: ")
                    Text(String(data: self.parsedResponse?.hostPublicKey.rawRepresentation ?? Data(), encoding: .ascii) ?? "(none)")
                }
            }
            
            Spacer()
            
            Button("Decrypt") {
                // client derives symmetric key
                let symmetricKey = sdk.deriveSymmetricKey(with: self.clientPrivateKey, self.parsedResponse!.hostPublicKey)
                
                let sealedBox = try! AES.GCM.SealedBox(combined: self.parsedResponse!.message)
                let decryptedData = try! AES.GCM.open(sealedBox, using: symmetricKey)
                self.decryptedMessage = String(data: decryptedData, encoding: .utf8)
            }
            Text(self.decryptedMessage ?? "(none)")
                .lineLimit(nil)
            
            Spacer()
        }.lineLimit(2)
        
        
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

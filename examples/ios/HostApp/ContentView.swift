//
//  ContentView.swift
//  HostApp
//
//  Created by Jungho Bang on 6/8/22.
//

import SwiftUI
import WalletSegueHost

struct ContentView: View {
    var body: some View {
        Button("Host") {
            let handler = HandshakeRequestHandler()
//            let response = handler.handle(request: self.request!)
//            self.response = try! response.encodedString()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

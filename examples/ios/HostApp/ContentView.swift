//
//  ContentView.swift
//  HostApp
//
//  Created by Jungho Bang on 6/8/22.
//

import SwiftUI
import WalletSegueHost

struct ContentView: View {
    let handler = HandshakeRequestHandler()
    
    var body: some View {
        Button("Host") {
            
        }.onOpenURL { url in
            let response = self.handler.handle(request: url)
            print(response!)
            UIApplication.shared.open(response!)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

//
//  AppDelegate.swift
//  NativeWeb3App
//
//  Created by Jungho Bang on 6/27/22.
//

import UIKit
import CoinbaseWalletSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        CoinbaseWalletSDK.configure(
            callback: URL(string: "https://myapp.xyz/mycallback")!
        )
        
        return true
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        let cbwallet = CoinbaseWalletSDK.shared
        if (try? cbwallet.handleResponse(url)) == true {
            return true
        }
        
        // handle other types of deep links
        return false
    }

}


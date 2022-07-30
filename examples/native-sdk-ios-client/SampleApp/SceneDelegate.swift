//
//  SceneDelegate.swift
//  SampleWeb3App
//
//  Created by Jungho Bang on 6/27/22.
//

import UIKit
import CoinbaseWalletSDK

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        
        logWalletSegueMessage(url: url)
        
        do {
            if try CoinbaseWalletSDK.shared.handleResponse(url) {
                return
            }
        } catch {
            print(error)
        }
    }
    
}


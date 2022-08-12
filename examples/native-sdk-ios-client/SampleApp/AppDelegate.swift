//
//  AppDelegate.swift
//  SampleWeb3App
//
//  Created by Jungho Bang on 6/27/22.
//

import UIKit
import CoinbaseWalletSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UIApplication.swizzleOpenURL()
        
        CoinbaseWalletSDK.configure(
            callback: URL(string: "myappxyz://mycallback")!
        )
        
        return true
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        if (try? CoinbaseWalletSDK.shared.handleResponse(url)) == true {
            return true
        }
        // handle other types of deep links
        return false
    }
    
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        if let url = userActivity.webpageURL,
           (try? CoinbaseWalletSDK.shared.handleResponse(url)) == true {
            return true
        }
        // handle other types of deep links
        return false
    }

}

extension UIApplication {
    static func swizzleOpenURL() {
        guard
            let original = class_getInstanceMethod(UIApplication.self, #selector(open(_:options:completionHandler:))),
            let swizzled = class_getInstanceMethod(UIApplication.self, #selector(swizzledOpen(_:options:completionHandler:)))
        else { return }
        method_exchangeImplementations(original, swizzled)
    }
    
    @objc func swizzledOpen(_ url: URL, options: [UIApplication.OpenExternalURLOptionsKey: Any], completionHandler completion: ((Bool) -> Void)?) {
        logWalletSegueMessage(url: url)
        
        // it's not recursive. below is actually the original open(_:) method
        self.swizzledOpen(url, options: options, completionHandler: completion)
    }
}

func logWalletSegueMessage(url: URL, function: String = #function) {
    let keyWindow = UIApplication.shared.connectedScenes
            .filter({$0.activationState == .foregroundActive})
            .compactMap({$0 as? UIWindowScene})
            .first?.windows
            .filter({$0.isKeyWindow}).first
    if let vc = keyWindow?.rootViewController as? ViewController {
        vc.logURL(url, function: function)
    }
}

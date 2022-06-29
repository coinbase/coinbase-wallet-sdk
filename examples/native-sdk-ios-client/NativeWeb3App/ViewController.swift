//
//  ViewController.swift
//  NativeWeb3App
//
//  Created by Jungho Bang on 6/27/22.
//

import UIKit
import CoinbaseWalletSDK

class ViewController: UITableViewController {
    
    @IBOutlet weak var isCBWalletInstalledLabel: UILabel!
    @IBOutlet weak var isConnectedLabel: UILabel!
    @IBOutlet weak var encodedURLTextView: UITextView!
    
    let cbwallet = CoinbaseWalletSDK.shared
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.isCBWalletInstalledLabel.text = "\(CoinbaseWalletSDK.isCoinbaseWalletInstalled())"
        self.isConnectedLabel.text = "\(cbwallet.isConnected())"
    }
    
    @IBAction func initiateHandshake(_ sender: Any) {
        let rawRequestURLForDebugging = cbwallet.initiateHandshake { result in
            print(result)
        }
        
        encodedURLTextView.text = rawRequestURLForDebugging?.absoluteString
    }
    
    @IBAction func resetConnection(_ sender: Any) {
    }
}


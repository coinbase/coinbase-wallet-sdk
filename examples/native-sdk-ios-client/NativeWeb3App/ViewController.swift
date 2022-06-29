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
    @IBOutlet weak var sessionPubKeyLabel: UILabel!
    @IBOutlet weak var isConnectedLabel: UILabel!
    @IBOutlet weak var logTextView: UITextView!
    
    private let cbwallet = CoinbaseWalletSDK.shared
    
    override func viewDidLoad() {
        super.viewDidLoad()
        isCBWalletInstalledLabel.text = "\(CoinbaseWalletSDK.isCoinbaseWalletInstalled())"
        updateSessionPubKey()
        updateIsConnected()
    }
    
    @IBAction func initiateHandshake(_ sender: Any) {
        let rawRequestURLForDebugging = cbwallet.initiateHandshake(
            initialActions: [
                Action(jsonRpc: .eth_requestAccounts),
                Action(jsonRpc: .personal_sign(fromAddress: "", data: "message".data(using: .utf8)!))
            ]
        ) { result in
            print(result)
            self.updateIsConnected()
        }
        
        printRawRequestURL(rawRequestURLForDebugging)
    }
    
    @IBAction func resetConnection(_ sender: Any) {
        let result = cbwallet.resetSession()
        logTextView.text = "\(result)"
        
        updateSessionPubKey()
    }
    
    // i should have chosen SwiftUI template...
    
    private func updateSessionPubKey() {
        sessionPubKeyLabel.text = cbwallet.sessionPublicKey.rawRepresentation.base64EncodedString()
    }
    
    private func updateIsConnected() {
        isConnectedLabel.text = "\(cbwallet.isConnected())"
    }
    
    private func printRawRequestURL(_ url: URL?) {
        guard let url = url else { return }
        
        do {
            let message: RequestMessage = try MessageConverter.decode(url, with: nil)
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(message)
            let jsonString = String(data: data, encoding: .utf8)!
            
            logTextView.text = "URL: \(url)\nJSON:\n\(jsonString)"
        } catch {
            print(error)
        }
    }
}


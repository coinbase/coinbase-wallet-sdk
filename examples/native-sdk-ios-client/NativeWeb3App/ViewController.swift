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
    @IBOutlet weak var ownPubKeyLabel: UILabel!
    @IBOutlet weak var peerPubKeyLabel: UILabel!
    
    @IBOutlet weak var logTextView: UITextView!
    
    private let cbwallet = CoinbaseWalletSDK.shared
    
    override func viewDidLoad() {
        super.viewDidLoad()
        isCBWalletInstalledLabel.text = "\(CoinbaseWalletSDK.isCoinbaseWalletInstalled())"
        updateSessionPubKey()
        updateIsConnected()
    }
    
    @IBAction func initiateHandshake() {
        let rawRequestURLForDebugging = cbwallet.initiateHandshake(
            initialActions: [
                Action(jsonRpc: .eth_requestAccounts),
                Action(jsonRpc: .personal_sign(fromAddress: "", data: "message".data(using: .utf8)!))
            ]
        ) { result in
            
            self.updateIsConnected()
        }
        
        printRawRequestURL(rawRequestURLForDebugging)
    }
    
    @IBAction func resetConnection() {
        let result = cbwallet.resetSession()
        self.log("\(result)")
        
        updateSessionPubKey()
    }
    
    @IBAction func makeRequest() {
        let rawRequestURLForDebugging = cbwallet.makeRequest(
            Request(actions: [
            ])
        ) { result in
            self.log("\(result)")
        }
        
        printRawRequestURL(rawRequestURLForDebugging)
    }
    
    // i should have chosen SwiftUI template...
    
    private func updateSessionPubKey() {
        DispatchQueue.main.async {
            self.ownPubKeyLabel.text = self.cbwallet.keyManager.ownPublicKey.rawRepresentation.base64EncodedString()
            self.peerPubKeyLabel.text = self.cbwallet.keyManager.peerPublicKey?.rawRepresentation.base64EncodedString() ?? "(nil)"
        }
    }
    
    private func updateIsConnected() {
        DispatchQueue.main.async {
            self.isConnectedLabel.text = "\(self.cbwallet.isConnected())"
        }
    }
    
    private func printRawRequestURL(_ url: URL?, function: String = #function) {
        guard let url = url else { return }
        
        do {
            let message: RequestMessage = try MessageConverter.decode(url, with: nil)
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(message)
            let jsonString = String(data: data, encoding: .utf8)!
            
            self.log("\(url)\nJSON:\n\(jsonString)", function: function)
        } catch {
            print(error)
        }
    }
    
    private func log(_ text: String, function: String = #function) {
        DispatchQueue.main.async {
            self.logTextView.text = "\(function): \(text)\n\n\(self.logTextView.text ?? "")"
        }
    }
}


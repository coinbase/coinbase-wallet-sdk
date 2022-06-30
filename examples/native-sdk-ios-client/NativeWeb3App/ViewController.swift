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
                Action(jsonRpc: .personal_sign(address: "", message: "message".data(using: .utf8)!))
            ]
        ) { result in
            switch result {
            case .success(let response):
                self.logObject(response)
            case .failure(let error):
                self.log("\(error)")
            }
            self.updateIsConnected()
        }
        
        logRawRequestURL(rawRequestURLForDebugging)
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
        
        logRawRequestURL(rawRequestURLForDebugging)
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
            let isConnected = self.cbwallet.isConnected()
            self.isConnectedLabel.textColor = isConnected ? .green : .red
            self.isConnectedLabel.text = "\(isConnected)"
        }
    }
    
    private func logRawRequestURL(_ url: URL?, function: String = #function) {
        guard let url = url else { return }
        
        do {
            let message: RequestMessage = try MessageConverter.decode(url, with: nil)
            self.log("URL: \(url)", function: function)
            self.logObject(message, function: function)
        } catch {
            print(error)
        }
    }
    
    private func logObject<T: Encodable>(_ object: T, function: String = #function) {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(object)
            let jsonString = String(data: data, encoding: .utf8)!
            self.log("JSON:\n\(jsonString)", function: function)
        } catch {
            print(error)
        }
    }
    
    private func log(_ text: String, function: String = #function) {
        DispatchQueue.main.async {
            self.logTextView.text = "\(function): \(text)\n\n\(self.logTextView.text ?? "")"
//            self.logTextView.text += "\(function): \(text)\n\n"
//            self.logTextView.scrollRangeToVisible(NSMakeRange(self.logTextView.text.count - 1, 1))
        }
    }
}


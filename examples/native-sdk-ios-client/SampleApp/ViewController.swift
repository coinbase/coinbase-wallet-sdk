//
//  ViewController.swift
//  SampleWeb3App
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
    
    private lazy var cbwallet = { CoinbaseWalletSDK.shared }()
    private var address: String?
    private let typedData = """
        {
          \"types\": {
            \"EIP712Domain\": [
              {
                \"name\": \"name\",
                \"type\": \"string\"
              },
              {
                \"name\": \"version\",
                \"type\": \"string\"
              },
              {
                \"name\": \"chainId\",
                \"type\": \"uint256\"
              },
              {
                \"name\": \"verifyingContract\",
                \"type\": \"address\"
              },
              {
                \"name\": \"salt\",
                \"type\": \"bytes32\"
              }
            ],
            \"Bid\": [
              {
                \"name\": \"amount\",
                \"type\": \"uint256\"
              },
              {
                \"name\": \"bidder\",
                \"type\": \"Identity\"
              }
            ],
            \"Identity\": [
              {
                \"name\": \"userId\",
                \"type\": \"uint256\"
              },
              {
                \"name\": \"wallet\",
                \"type\": \"address\"
              }
            ]
          },
          \"domain\": {
            \"name\": \"DApp Browser Test DApp\",
            \"version\": \"1\",
            \"chainId\": 1,
            \"verifyingContract\": \"0x1C56346CD2A2Bf3202F771f50d3D14a367B48070\",
            \"salt\": \"0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558\"
          },
          \"primaryType\": \"Bid\",
          \"message\": {
            \"amount\": 100,
            \"bidder\": {
              \"userId\": 323,
              \"wallet\": \"0x3333333333333333333333333333333333333333\"
            }
          }
        }
        """
    
    override func viewDidLoad() {
        super.viewDidLoad()
        isCBWalletInstalledLabel.text = "\(CoinbaseWalletSDK.isCoinbaseWalletInstalled())"
        updateSessionStatus()
    }
    
    @IBAction func initiateHandshake() {
        cbwallet.initiateHandshake(
            initialActions: [
                Action(jsonRpc: .eth_requestAccounts)
            ]
        ) { result, account in
            switch result {
            case .success(let response):
                self.logObject(label: "Response:\n", response)
                
                guard let account = account else { return }
                self.logObject(label: "Account:\n", account)
                self.address = account.address
                
            case .failure(let error):
                self.log("\(error)")
            }
            self.updateSessionStatus()
        }
    }
    
    @IBAction func resetConnection() {
        self.address = nil
        
        let result = cbwallet.resetSession()
        self.log("\(result)")
        
        updateSessionStatus()
    }
    
    @IBAction func makeRequest() {
        let address = self.address ?? ""
        if address.isEmpty {
            self.log("address hasn't been set.")
        }
        
        cbwallet.makeRequest(
            Request(actions: [
                Action(jsonRpc: .personal_sign(address: address, message: "message")),
                Action(jsonRpc: .eth_signTypedData_v3(address: address, typedDataJson: typedData))
            ])
        ) { result in
            self.log("\(result)")
        }
    }
    
    // i should have chosen SwiftUI template...
    
    private func updateSessionStatus() {
        DispatchQueue.main.async {
            let isConnected = self.cbwallet.isConnected()
            self.isConnectedLabel.textColor = isConnected ? .green : .red
            self.isConnectedLabel.text = "\(isConnected)"
            
            self.ownPubKeyLabel.text = self.cbwallet.keyManager.ownPublicKey.rawRepresentation.base64EncodedString()
            self.peerPubKeyLabel.text = self.cbwallet.keyManager.peerPublicKey?.rawRepresentation.base64EncodedString() ?? "(nil)"
        }
    }
    
    private func logObject<T: Encodable>(label: String = "", _ object: T, function: String = #function) {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(object)
            let jsonString = String(data: data, encoding: .utf8)!
            self.log("\(label)\(jsonString)", function: function)
        } catch {
            self.log("\(error)")
        }
    }
    
    func logURL(_ url: URL?, function: String = #function) {
        guard let url = url else { return }
        self.log("URL: \(url)", function: function)
        
        guard
            !cbwallet.isConnected(),
            let message: RequestMessage = try? MessageConverter.decode(url, with: nil)
        else { return }
        self.logObject(message, function: function)
    }
    
    private func log(_ text: String, function: String = #function) {
        DispatchQueue.main.async {
            self.logTextView.text = "\(function): \(text)\n\n\(self.logTextView.text ?? "")"
            //  self.logTextView.text += "\(function): \(text)\n\n"
            //  self.logTextView.scrollRangeToVisible(NSMakeRange(self.logTextView.text.count - 1, 1))
        }
    }
}


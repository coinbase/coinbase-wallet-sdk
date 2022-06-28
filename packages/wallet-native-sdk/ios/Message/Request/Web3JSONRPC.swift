//
//  Web3JSONRPC.swift
//  CoinbaseWalletSDK
//
//  Created by Jungho Bang on 6/28/22.
//

import Foundation

public typealias BigInt = String

public enum Web3JSONRPC: Codable {
    case eth_requestAccounts
    case personal_sign(
        fromAddress: String,
        data: Data
    )
//    case eth_signTypedData(
//        fromAddress: String,
//        data: Data
//    )
    case eth_signTransaction(
        fromAddress: String,
        toAddress: String?,
        weiValue: BigInt,
        data: Data,
        nonce: Int?,
        gasPriceInWei: BigInt?,
        maxFeePerGas: BigInt?,
        maxPriorityFeePerGas: BigInt?,
        gasLimit: BigInt?,
        chainId: Int
    )
    case eth_sendTransaction(
        fromAddress: String,
        toAddress: String?,
        weiValue: BigInt,
        data: Data,
        nonce: Int?,
        gasPriceInWei: BigInt?,
        maxFeePerGas: BigInt?,
        maxPriorityFeePerGas: BigInt?,
        gasLimit: BigInt?,
        chainId: Int
    )
    case wallet_addEthereumChain(
        chainId: Int,
        chainName: String?,
        blockExplorerUrls: [String]?,
        iconUrls: [String]?,
        rpcUrls: [String]
    )
    case wallet_switchEthereumChain(chainId: Int)
    case wallet_watchAsset(
        chainId: Int?,
        address: String,
        symbol: String?,
        decimals: Int?,
        image: String?
    )
    
    var rawValues: (method: String, paramsJson: String) {
        let json = try! JSONEncoder().encode(self)
        let dictionary = try! JSONSerialization.jsonObject(with: json) as! [String: Any]
        
        let method = dictionary.keys.first!
        
        let params = dictionary[method]!
        let paramsJson = String(data: try! JSONSerialization.data(withJSONObject: params), encoding: .utf8) ?? ""
        
        return (method, paramsJson)
    }
}

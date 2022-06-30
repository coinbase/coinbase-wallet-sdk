//
//  Error.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/16/22.
//

import Foundation

@available(iOS 13.0, *)
extension CoinbaseWalletSDK {
    enum Error: Swift.Error {
        case encodingFailed
        case decodingFailed
        case missingSymmetricKey
        case openUrlFailed
        case walletReturnedError(String)
    }
}

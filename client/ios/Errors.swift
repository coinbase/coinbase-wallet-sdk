//
//  Errors.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/16/22.
//

import Foundation

enum CoinbaseWalletSDKError: Error {
    case encodingFailed
    case decodingFailed
    case missingSymmetricKey
    case openUrlFailed
    case walletReturnedError(String)
}

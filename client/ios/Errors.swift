//
//  Errors.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/16/22.
//

import Foundation

enum CoinbaseWalletSDKError: Error {
    case notBase64Encoded
    case urlEncodingFailed
    case malformedUrl
    case missingSymmetricKey
    case openUrlFailed
}

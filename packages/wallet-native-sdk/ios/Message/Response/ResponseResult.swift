//
//  ResponseResult.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/24/22.
//

import Foundation

@available(iOS 13.0, *)
public typealias ResponseResult = Result<Response, Error>

@available(iOS 13.0, *)
public typealias ResponseHandler = (ResponseResult) -> Void

@available(iOS 13.0, *)
public struct Response {
    public let sender: CoinbaseWalletSDK.PublicKey
    public let timestamp: Date
    public let content: [Result<String, Error>]
}

@available(iOS 13.0, *)
extension ResponseMessage {
    var result: ResponseResult {
        switch self.content {
        case .response(_, let values):
            let content: [Result<String, Error>] = values.map {
                switch $0 {
                case let .result(value):
                    return .success(value)
                case let .error(code, message):
                    return .failure(CoinbaseWalletSDK.Error.walletExecutionFailed(code, message))
                }
            }
            return .success(
                Response(
                    sender: self.sender,
                    timestamp: self.timestamp,
                    content: content
                )
            )
        case .failure(_, let description):
            return .failure(CoinbaseWalletSDK.Error.walletReturnedError(description))
        }
    }
}

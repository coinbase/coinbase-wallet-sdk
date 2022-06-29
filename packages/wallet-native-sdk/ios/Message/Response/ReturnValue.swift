//
//  ReturnValue.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/24/22.
//

import Foundation

public enum ReturnValue: BaseContent {
    case result(value: String)
    case error(code: Int, message: String)
}

@available(iOS 13.0, *)
public typealias ResponseResult = Result<BaseMessage<[ReturnValue]>, Error>

@available(iOS 13.0, *)
public typealias ResponseHandler = (ResponseResult) -> Void

@available(iOS 13.0, *)
extension ResponseMessage {
    var requestId: UUID {
        switch self.content {
        case .response(let requestId, _),
             .failure(let requestId, _):
            return requestId
        }
    }
    
    var result: ResponseResult {
        switch self.content {
        case .response(_, let results):
            return .success(
                BaseMessage<[ReturnValue]>(
                    uuid: self.uuid,
                    sender: self.sender,
                    content: results,
                    version: self.version,
                    timestamp: self.timestamp
                )
            )
        case .failure(_, let description):
            return .failure(CoinbaseWalletSDK.Error.walletReturnedError(description))
        }
    }
}

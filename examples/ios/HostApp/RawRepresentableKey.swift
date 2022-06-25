//
//  Key.swift
//  native-sdk-support
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation
import CoinbaseWalletSDK

extension RawRepresentableKey {
    init(base64Encoded: String) throws {
        guard let data = Data(base64Encoded: base64Encoded) else {
            throw NativeSDKSupportError.keyDecodingFailed
        }
        try self.init(rawRepresentation: data)
    }
    
    func base64EncodedString() -> String {
        return self.rawRepresentation.base64EncodedString()
    }
}


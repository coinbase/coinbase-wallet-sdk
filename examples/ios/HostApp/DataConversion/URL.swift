//
//  URL.swift
//  native-sdk-support
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation

extension String {
    func asURL() throws -> URL {
        guard let url = URL(string: self) else {
            throw NativeSDKSupportError.urlConversionFailed
        }
        return url
    }
}

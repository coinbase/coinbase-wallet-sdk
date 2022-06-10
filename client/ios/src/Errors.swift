//
//  Errors.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

enum WalletSegueError: Error {
    case notBase64Encoded
    case urlEncodingFailed
}

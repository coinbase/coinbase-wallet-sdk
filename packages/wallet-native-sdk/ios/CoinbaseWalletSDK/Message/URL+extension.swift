//
//  URL+extension.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/29/22.
//

import Foundation

extension URL {
    var isHttp: Bool {
        return self.scheme?.lowercased().hasPrefix("http") ?? false
    }
}

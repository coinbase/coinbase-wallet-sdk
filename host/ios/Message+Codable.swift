//
//  Message+Codable.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation
import WalletSegue

extension RequestMessage: DecodableMessage {}

extension ResponseMessage: EncodableMessage {}

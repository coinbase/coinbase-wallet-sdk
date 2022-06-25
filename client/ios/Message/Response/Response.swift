//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct Response: Codable {
    // TODO
    public typealias ActionResult = String
    
    public let requestId: UUID
    public let results: [ActionResult]
    
    public init(requestId: UUID, results: [ActionResult]) {
        self.requestId = requestId
        self.results = results
    }
}

public typealias ResponseResult = Result<Response, Error>
public typealias ResponseHandler = (ResponseResult) -> Void

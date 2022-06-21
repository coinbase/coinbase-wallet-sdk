//
//  Response.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/21/22.
//

import Foundation

public struct Response: Codable {
    // TODO
    public typealias Result = String
    
    public let requestId: UUID
    public let results: [Result]
    
    public init(requestId: UUID, results: [Response.Result]) {
        self.requestId = requestId
        self.results = results
    }
}

public typealias ResponseResult = Result<Response, Error>
public typealias ResponseHandler = (ResponseResult) -> Void

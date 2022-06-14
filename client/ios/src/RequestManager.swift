//
//  RequestManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

class RequestManager {
    typealias ResponseHandler = () -> Void

    struct Execution {
        enum State {
            case created
            case sent
            case executed
            case failed
        }
        
        let request: Request
        let state: State
        let responseHandler: ResponseHandler
    }

    private var executions = [UUID: Execution]()
    
    func createRequest(
        action: Request.Action,
        account: Request.Account?,
        responseHandler: @escaping ResponseHandler
    ) -> Request {
        let uuid = UUID()
        let request = Request(uuid: uuid, actions: [action], account: account)
        
        executions[uuid] = Execution(
            request: request,
            state: .created,
            responseHandler: responseHandler
        )
        
        return request
    }
}

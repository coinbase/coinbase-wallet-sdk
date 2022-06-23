//
//  TaskManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

@available(iOS 13.0, *)
class TaskManager {
    private var tasks = [UUID: Task]()
    
    func registerResponseHandler(
        for requestMessage: RequestMessage,
        _ handler: @escaping ResponseHandler
    ) {
        let uuid = requestMessage.uuid
        tasks[uuid] = Task(
            request: requestMessage,
            handler: handler,
            timestamp: Date()
        )
    }
    
    @discardableResult func handleResponseMessage(_ message: ResponseMessage) -> Bool {
        let requestId: UUID
        let result: ResponseResult
        switch message.content {
        case .response(let response):
            requestId = response.requestId
            result = .success(response)
        case .error(let error):
            requestId = error.requestId
            result = .failure(CoinbaseWalletSDKError.walletReturnedError(error.description))
        }
        
        guard let task = tasks[requestId] else {
            return false
        }
        
        task.handler(result)
        tasks.removeValue(forKey: requestId)
        return true
    }
    
}

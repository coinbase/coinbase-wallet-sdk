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
        let requestId = message.requestId
        
        guard let task = tasks[requestId] else {
            return false
        }
        
        task.handler(message.result)
        tasks.removeValue(forKey: requestId)
        return true
    }
    
    func reset() {
        tasks.removeAll()
    }
    
}

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
        for request: RequestMessage,
        _ handler: @escaping ResponseHandler
    ) {
        let uuid = request.uuid
        tasks[uuid] = Task(
            request: request,
            handler: handler,
            timestamp: Date()
        )
    }
    
    @discardableResult func runResponseHandler(with response: ResponseMessage) -> Bool {
        let requestId = response.content.requestId
 
        guard let task = tasks[requestId] else {
            return false
        }
        
        task.handler(response.result)
        tasks.removeValue(forKey: requestId)
        return true
    }
    
    func findRequest(for response: EncryptedResponseMessage) -> RequestMessage? {
        guard let task = tasks[response.content.requestId] else {
            return nil
        }
    
        return task.request
    }
    
    func reset() {
        tasks.removeAll()
    }
    
}

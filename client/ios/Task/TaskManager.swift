//
//  TaskManager.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/9/22.
//

import Foundation

class TaskManager {
    private var tasks = [UUID: Task]()
    
    func onResponse(
        to requestMessage: Message,
        _ handler: @escaping ResponseHandler
    ) {
        let uuid = requestMessage.uuid
        tasks[uuid] = Task(
            message: requestMessage,
            handler: handler
        )
    }
}

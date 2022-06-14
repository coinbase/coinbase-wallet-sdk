//
//  Task.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/14/22.
//

import Foundation

typealias ResponseHandler = (Request, Response) -> Void

struct Task {
    let message: Message
    let handler: ResponseHandler
    
    enum State {
        case created
        case executed
        case failed
    }
    
    var state: State = .created
}

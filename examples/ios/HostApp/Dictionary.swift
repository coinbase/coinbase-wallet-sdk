//
//  Dictionary.swift
//  native-sdk-support
//
//  Created by Jungho Bang on 6/23/22.
//

import Foundation

extension Encodable {
    func asDictionary() throws -> [String: Any] {
        let data = try JSONEncoder().encode(self)
        guard let dictionary = try JSONSerialization.jsonObject(with: data, options: .allowFragments) as? [String: Any] else {
            throw NativeSDKSupportError.dictionaryEncodingFailed
        }
        return dictionary
    }
}

extension Decodable {
    static func decodeDictionary(_ dictionary: [String: Any]) throws -> Self {
        let data = try JSONSerialization.data(withJSONObject: dictionary, options: .prettyPrinted)
        let object = try JSONDecoder().decode(Self.self, from: data)
        return object
    }
}

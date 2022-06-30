//
//  KeyStorage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

enum KeyStorageError: Error {
    case storeFailed(OSStatus)
    case readFailed(OSStatus)
    case deleteFailed(OSStatus)
}

@available(iOS 13.0, *)
final class KeyStorage {
    private let service: String
    
    init(host: URL) {
        service = "wsegue.keystorage.\(host.host!)"
    }
    
    func store<K>(_ data: K, at item: KeyStorageItem<K>) throws {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: item.name,
            kSecAttrService: service,
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecUseDataProtectionKeychain: true,
            kSecValueData: data.rawRepresentation
        ] as [String: Any]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeyStorageError.storeFailed(status)
        }
    }
    
    func read<K>(_ item: KeyStorageItem<K>) throws -> K? {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: item.name,
            kSecAttrService: service,
            kSecUseDataProtectionKeychain: true,
            kSecReturnData: true
        ] as [String: Any]
        
        var item: CFTypeRef?
        switch SecItemCopyMatching(query as CFDictionary, &item) {
        case errSecSuccess:
            guard let data = item as? Data else { return nil }
            return try K(rawRepresentation: data)  // Convert back to a key.
        case errSecItemNotFound:
            return nil
        case let status:
            throw KeyStorageError.readFailed(status)
        }
    }
    
    func delete<K>(_ item: KeyStorageItem<K>) throws {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecUseDataProtectionKeychain: true,
            kSecAttrAccount: item.name,
            kSecAttrService: service
        ] as [String: Any]
        
        switch SecItemDelete(query as CFDictionary) {
        case errSecItemNotFound, errSecSuccess:
            break // Okay to ignore
        case let status:
            throw KeyStorageError.deleteFailed(status)
        }
    }
}

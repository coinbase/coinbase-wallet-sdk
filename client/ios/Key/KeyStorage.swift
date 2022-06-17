//
//  KeyStorage.swift
//  WalletSegue
//
//  Created by Jungho Bang on 6/17/22.
//

import Foundation

class KeyStorage {
    func storeKey<K>(_ key: K, to item: KeyStorageItem<K>) throws {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: item.name,
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecUseDataProtectionKeychain: true,
            kSecValueData: key.rawRepresentation
        ] as [String: Any]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw CoinbaseWalletSDKError.keyStoreFailed("Unable to store item: \(status.message)")
        }
    }
    
    func readKey<K>(from item: KeyStorageItem<K>) throws -> K? {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: item.name,
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
            throw CoinbaseWalletSDKError.keyStoreFailed("Keychain read failed: \(status.message)")
        }
    }
    
    func deleteKey<K>(_ item: KeyStorageItem<K>) throws {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecUseDataProtectionKeychain: true,
            kSecAttrAccount: item.name
        ] as [String: Any]
        
        switch SecItemDelete(query as CFDictionary) {
        case errSecItemNotFound, errSecSuccess:
            break // Okay to ignore
        case let status:
            throw CoinbaseWalletSDKError.keyStoreFailed("Unexpected deletion error: \(status.message)")
        }
    }
}

extension OSStatus {
    var message: String {
        return (SecCopyErrorMessageString(self, nil) as String?) ?? String(self)
    }
}

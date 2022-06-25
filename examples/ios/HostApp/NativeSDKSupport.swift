import CoinbaseWalletSDK
import CryptoKit

public typealias RCTPromiseResolveBlock = (Any) -> Void
public typealias RCTPromiseRejectBlock = (Int?, String?, Error?) -> Void

class NativeSDKSupport {
    func generateKeyPair(
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        do {
            let keyPair = KeyPair()
            let dictionary = try keyPair.asDictionary()
            resolve(dictionary)
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }
    
    func decodeRequest(
        _ urlStr: String,
        ownPrivateKeyStr: String?,
        peerPublicKeyStr: String?,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        do {
            let url = try urlStr.asURL()
            
            let symmetricKey = try self.deriveSymmetricKey(with: ownPrivateKeyStr, and: peerPublicKeyStr)
            
            let request: RequestMessage = try MessageConverter.decode(url, with: symmetricKey)
            let dictionary = try request.asDictionary()
            
            resolve(dictionary)
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }
    
    func encodeResponse(
        _ dictionary: [String: Any],
        recipientStr: String,
        ownPrivateKeyStr: String?,
        peerPublicKeyStr: String?,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        do {
            let recipient = try recipientStr.asURL()
            
            let symmetricKey = try self.deriveSymmetricKey(with: ownPrivateKeyStr, and: peerPublicKeyStr)
            
            let response = try ResponseMessage.decodeDictionary(dictionary)
            let url = try MessageConverter.encode(response, to: recipient, with: symmetricKey)
            
            resolve(url)
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }
    
    private func deriveSymmetricKey(
        with ownPrivateKeyStr: String?,
        and peerPublicKeyStr: String?
    ) throws -> SymmetricKey? {
        if
            let ownPrivateKeyStr = ownPrivateKeyStr,
            let peerPublicKeyStr = peerPublicKeyStr,
            !ownPrivateKeyStr.isEmpty,
            !peerPublicKeyStr.isEmpty
        {
            do {
                let ownPrivateKey = try PrivateKey(base64Encoded: ownPrivateKeyStr)
                let peerPublicKey = try PublicKey(base64Encoded: peerPublicKeyStr)
                let symmetricKey = try Cipher.deriveSymmetricKey(with: ownPrivateKey, peerPublicKey)
                return symmetricKey
            } catch {
                throw error
            }
        } else {
            return nil
        }
    }
}

const { encrypt, decrypt } = require('../build/npm/dist/relay/aes256gcm');
const { randomBytesHex } = require('../build/npm/dist/util');

describe('encryption and decryption tests', function() {

  it('decrypted output matches original input', done => {
    (async function() {
      const secret = randomBytesHex(32)
      let input = "walletlink:2.0"
      let cipherText = await encrypt(input, secret)

      decrypt(cipherText, secret).subscribe({
        next: decryptedText => {
          expect(input).toEqual(decryptedText);
          done()
        }
      })
    })()
  });

  it("decrypt data sample from client", done => {
    (async function() {
      const cipherText = "06593325a922a928913b5c6ea26f848c4545bcea4e26c4f5ee745316ff22b2780aeccc565730514b2820a94b03f5f89fe7542a35bbdd87a1d52a4352f49482781113db09266c668696778e0a94bc9f866f1e92e7262fd0bb811838284cc64cbc4552b33e9c6fb2582cea4f49471d6d46a16a5c8ac83ee8483ed4dc01f1fde3bfd7a2f173715e0a8d09dd4907483f096a845bff698831ea277c1ca4223d3f6073174cb35119d0a795c1a9cb4f32ee1dcc254d8931";
      const secret = "c356fe708ea7bbf7b1cc9ff9813c32772b6e0d16332da4c031ba9ea88be9b5ed"
      const sampleDataResult = "{\"type\":\"WEB3_RESPONSE\",\"id\":\"791fe0ec3dc3de49\",\"response\":{\"method\":\"requestEthereumAccounts\",\"result\":[\"0xdf0635793e91d4f8e7426dbd9ed08471186f428d\"]}}"
      decrypt(cipherText, secret).subscribe({
        next: value => {
          expect(sampleDataResult).toEqual(value);
          done()
        }
      })
    })()
  })

});
import { WalletLinkCipher } from './WalletLinkCipher.js';
import { randomBytesHex } from ':core/type/util.js';

const secret = 'c356fe708ea7bbf7b1cc9ff9813c32772b6e0d16332da4c031ba9ea88be9b5ed';

describe('aes256gcm', () => {
  test('encrypt/decrypt', async () => {
    const randSecret = randomBytesHex(32);
    const cipher = new WalletLinkCipher(randSecret);

    const encrypted = await cipher.encrypt('plain text string');

    expect(encrypted.length).toEqual(90);

    // decrypted output matches original input
    const decrypted = await cipher.decrypt(encrypted);

    expect(decrypted).toBe('plain text string');
  });

  test('decrypt', async () => {
    const cipherText =
      '06593325a922a928913b5c6ea26f848c4545bcea4e26c4f5ee745316ff22b2780aeccc565730514b2820a94b03f5f89fe7542a35bbdd87a1d52a4352f49482781113db09266c668696778e0a94bc9f866f1e92e7262fd0bb811838284cc64cbc4552b33e9c6fb2582cea4f49471d6d46a16a5c8ac83ee8483ed4dc01f1fde3bfd7a2f173715e0a8d09dd4907483f096a845bff698831ea277c1ca4223d3f6073174cb35119d0a795c1a9cb4f32ee1dcc254d8931';
    const sampleDataResult = {
      type: 'WEB3_RESPONSE',
      id: '791fe0ec3dc3de49',
      response: {
        method: 'requestEthereumAccounts',
        result: ['0xdf0635793e91d4f8e7426dbd9ed08471186f428d'],
      },
    };

    const cipher = new WalletLinkCipher(secret);

    const decrypted = await cipher.decrypt(cipherText);

    expect(sampleDataResult).toEqual(JSON.parse(decrypted));
  });

  test('errors', async () => {
    const cipher = new WalletLinkCipher('123456');

    await expect(cipher.encrypt('plain text string')).rejects.toThrowError(
      'secret must be 256 bits'
    );

    await expect(cipher.decrypt('plain stext string')).rejects.toThrowError(
      'secret must be 256 bits'
    );

    const differentCipher = new WalletLinkCipher(secret);

    await expect(differentCipher.decrypt('text')).rejects.toThrow();
  });
});
